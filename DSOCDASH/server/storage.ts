import { db } from "./db";
import { favoriteLocations, type CreateLocationRequest, type LocationResponse } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getLocations(): Promise<LocationResponse[]>;
  createLocation(location: CreateLocationRequest): Promise<LocationResponse>;
  deleteLocation(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getLocations(): Promise<LocationResponse[]> {
    return await db.select().from(favoriteLocations);
  }

  async createLocation(location: CreateLocationRequest): Promise<LocationResponse> {
    const [newLocation] = await db.insert(favoriteLocations).values(location).returning();
    return newLocation;
  }

  async deleteLocation(id: number): Promise<void> {
    await db.delete(favoriteLocations).where(eq(favoriteLocations.id, id));
  }
}

export const storage = new DatabaseStorage();
