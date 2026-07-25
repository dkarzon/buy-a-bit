import {
  productCreateInput,
  productGetBySlugInput,
  productIdInput,
  productUpdateInput,
} from "@buy-a-bit/shared";
import { and, asc, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "node:crypto";

import { merchants, products } from "../../db/schema.js";
import { generateProductQr } from "../../services/qr.js";
import { merchantProcedure, publicProcedure, router } from "../trpc.js";

function webBaseUrl(): string {
  return (process.env.WEB_URL ?? "http://localhost:5173").replace(/\/$/, "");
}

function landingPageUrlForSlug(slug: string): string {
  return `${webBaseUrl()}/p/${slug}`;
}

/** URL-safe slug from name + short random suffix for uniqueness. */
function createProductSlug(name: string): string {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "product";
  return `${base}-${randomBytes(4).toString("hex")}`;
}

function toProductRecord(product: typeof products.$inferSelect) {
  return {
    id: product.id,
    merchantId: product.merchantId,
    slug: product.slug,
    name: product.name,
    priceCents: product.priceCents,
    description: product.description,
    imageUrl: product.imageUrl,
    stockCount: product.stockCount,
    isAvailable: product.isAvailable,
    sortOrder: product.sortOrder,
    createdAt: product.createdAt,
  };
}

export const productRouter = router({
  list: merchantProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(products)
      .where(eq(products.merchantId, ctx.merchant.id))
      .orderBy(asc(products.sortOrder), desc(products.createdAt));

    return rows.map(toProductRecord);
  }),

  get: merchantProcedure
    .input(productIdInput)
    .query(async ({ ctx, input }) => {
      const [product] = await ctx.db
        .select()
        .from(products)
        .where(
          and(eq(products.id, input.id), eq(products.merchantId, ctx.merchant.id)),
        )
        .limit(1);

      if (!product) {
        return null;
      }

      const landingPageUrl = landingPageUrlForSlug(product.slug);
      const qrDataUrl = await generateProductQr(landingPageUrl);

      return {
        ...toProductRecord(product),
        qrDataUrl,
        landingPageUrl,
      };
    }),

  create: merchantProcedure
    .input(productCreateInput)
    .mutation(async ({ ctx, input }) => {
      const slug = createProductSlug(input.name);
      const landingPageUrl = landingPageUrlForSlug(slug);

      const [created] = await ctx.db
        .insert(products)
        .values({
          merchantId: ctx.merchant.id,
          slug,
          name: input.name,
          priceCents: input.priceCents,
          description: input.description ?? null,
          imageUrl: input.imageUrl ?? null,
          stockCount: input.stockCount ?? null,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create product",
        });
      }

      const qrDataUrl = await generateProductQr(landingPageUrl);

      return {
        id: created.id,
        slug: created.slug,
        name: created.name,
        priceCents: created.priceCents,
        description: created.description,
        imageUrl: created.imageUrl,
        stockCount: created.stockCount,
        qrDataUrl,
        landingPageUrl,
      };
    }),

  update: merchantProcedure
    .input(productUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      const patch: Partial<typeof products.$inferInsert> = {};
      if (fields.name !== undefined) patch.name = fields.name;
      if (fields.priceCents !== undefined) patch.priceCents = fields.priceCents;
      if (fields.description !== undefined) patch.description = fields.description;
      if (fields.imageUrl !== undefined) patch.imageUrl = fields.imageUrl;
      if (fields.stockCount !== undefined) patch.stockCount = fields.stockCount;
      if (fields.isAvailable !== undefined) patch.isAvailable = fields.isAvailable;

      if (Object.keys(patch).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No product fields to update",
        });
      }

      const [updated] = await ctx.db
        .update(products)
        .set(patch)
        .where(
          and(eq(products.id, id), eq(products.merchantId, ctx.merchant.id)),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return toProductRecord(updated);
    }),

  delete: merchantProcedure
    .input(productIdInput)
    .mutation(async ({ input }) => {
      void input;
      throw new Error("Not implemented");
    }),

  getBySlug: publicProcedure
    .input(productGetBySlugInput)
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          id: products.id,
          slug: products.slug,
          name: products.name,
          priceCents: products.priceCents,
          description: products.description,
          imageUrl: products.imageUrl,
          stockCount: products.stockCount,
          isAvailable: products.isAvailable,
          businessName: merchants.businessName,
          isStoreOpen: merchants.isStoreOpen,
        })
        .from(products)
        .innerJoin(merchants, eq(products.merchantId, merchants.id))
        .where(eq(products.slug, input.slug))
        .limit(1);

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        priceCents: row.priceCents,
        description: row.description,
        imageUrl: row.imageUrl,
        stockCount: row.stockCount,
        isAvailable: row.isAvailable,
        merchant: {
          businessName: row.businessName,
          isStoreOpen: row.isStoreOpen,
        },
      };
    }),
});
