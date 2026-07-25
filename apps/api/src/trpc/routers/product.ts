import {
  productCreateInput,
  productGetBySlugInput,
  productIdInput,
  productUpdateInput,
} from "@buy-a-bit/shared";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "node:crypto";

import { merchants, products } from "../../db/schema.js";
import { generateProductQr } from "../../services/qr.js";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";

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

export const productRouter = router({
  list: protectedProcedure.query(async () => {
    // Day 1: list products for ctx.merchant
    return [];
  }),

  create: protectedProcedure
    .input(productCreateInput)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.merchant) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Complete store onboarding first",
        });
      }

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

  update: protectedProcedure
    .input(productUpdateInput)
    .mutation(async ({ input }) => {
      void input;
      throw new Error("Not implemented");
    }),

  delete: protectedProcedure
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
