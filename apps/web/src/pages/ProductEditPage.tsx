import { useParams } from "react-router-dom";

export function ProductEditPage() {
  const { id } = useParams();

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-3xl font-semibold">Edit product</h1>
      <p className="mt-2 text-sm opacity-70">Product id: {id}</p>
      <p className="mt-4 text-sm opacity-70">
        Download QR / write NFC — wired after <code>product.create</code>.
      </p>
    </main>
  );
}
