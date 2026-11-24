import { MongoClient, type Db } from "mongodb";

const globalWithMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

export async function getLearningDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured.");

  globalWithMongo.mongoClientPromise ??= new MongoClient(uri).connect();
  const client = await globalWithMongo.mongoClientPromise;
  return client.db(process.env.MONGODB_DB || "drillsim");
}