import bikeImage from "@/assets/bike-featured.jpg";
import experienceImage from "@/assets/experience-featured.jpg";
import homestayImage from "@/assets/homestay-featured.jpg";
import hondaCityImage from "@/assets/vehicles/honda-city.jpg";

type ListingImageType = "stay" | "hotel" | "resort" | "car" | "bike" | "experience";

const fallbackByType: Record<ListingImageType, string> = {
  stay: homestayImage,
  hotel: homestayImage,
  resort: homestayImage,
  car: hondaCityImage,
  bike: bikeImage,
  experience: experienceImage,
};

export function resolveListingCardImage(images: string[] | null | undefined, type: ListingImageType): string {
  const first = Array.isArray(images) ? images.find((img) => typeof img === "string" && img.trim().length > 0) : "";
  return first?.trim() || fallbackByType[type];
}
