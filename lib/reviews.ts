export type ReviewStatus = "published" | "pending" | "hidden";

export type MasterReview = {
  id: string;
  bookingId: string;
  masterId: string;
  clientId: string;
  clientName: string;
  clientAvatarUrl?: string;
  serviceTitle?: string;
  projectId?: string;
  rating: number;
  qualityRating?: number;
  deadlinesRating?: number;
  communicationRating?: number;
  estimateRating?: number;
  cleanlinessRating?: number;
  text: string;
  imageUrls: string[];
  status: ReviewStatus;
  createdAt: string;
  updatedAt?: string;
  masterReply?: string;
  masterRepliedAt?: string;
  verifiedBooking: boolean;
};

export type ReviewAggregate = {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  criteria: Partial<Record<"quality" | "deadlines" | "communication" | "estimate" | "cleanliness", number>>;
};

export function reviewInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "К";
}
