import client from "./client";

export async function getBatchMaterials(batchId) {
  const { data } = await client.get(`/materials/batch/${batchId}`);
  return data;
}
