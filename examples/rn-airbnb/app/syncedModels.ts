import Realm from "realm";

export const listingsAndReviewSchema: Realm.ObjectSchema = {
  name: "listingsAndReview",
  properties: {
    _id: "string",
    access: "string?",
    accommodates: "int?",
    address: "listingsAndReview_address",
    amenities: "string[]",
    availability: "listingsAndReview_availability",
    bathrooms: "decimal128?",
    bed_type: "string?",
    bedrooms: "int?",
    beds: "int?",
    calendar_last_scraped: "date?",
    cancellation_policy: "string?",
    cleaning_fee: "decimal128?",
    description: "string?",
    extra_people: "decimal128?",
    first_review: "date?",
    guests_included: "decimal128?",
    host: "listingsAndReview_host",
    house_rules: "string?",
    images: "listingsAndReview_images",
    interaction: "string?",
    last_review: "date?",
    last_scraped: "date?",
    listing_url: "string?",
    maximum_nights: "string?",
    minimum_nights: "string?",
    monthly_price: "decimal128?",
    name: { type: "string", indexed: "full-text", optional: true },
    neighborhood_overview: "string?",
    notes: "string?",
    number_of_reviews: "int?",
    price: "decimal128?",
    property_type: "string?",
    review_scores: "listingsAndReview_review_scores",
    reviews: "listingsAndReview_reviews[]",
    room_type: "string?",
    security_deposit: "decimal128?",
    space: "string?",
    summary: "string?",
    transit: "string?",
    weekly_price: "decimal128?",
  },
  primaryKey: "_id",
};

export class ListingsAndReview extends Realm.Object<ListingsAndReview> {
  _id!: string;
  access?: string;
  accommodates?: number;
  address?: ListingsAndReview_address;
  amenities: Realm.List<string>;
  availability?: ListingsAndReview_availability;
  bathrooms?: Realm.BSON.Decimal128;
  bed_type?: string;
  bedrooms?: number;
  beds?: number;
  calendar_last_scraped?: Date;
  cancellation_policy?: string;
  cleaning_fee?: Realm.BSON.Decimal128;
  description?: string;
  extra_people?: Realm.BSON.Decimal128;
  first_review?: Date;
  guests_included?: Realm.BSON.Decimal128;
  host?: ListingsAndReview_host;
  house_rules?: string;
  images?: ListingsAndReview_images;
  interaction?: string;
  last_review?: Date;
  last_scraped?: Date;
  listing_url?: string;
  maximum_nights?: string;
  minimum_nights?: string;
  monthly_price?: Realm.BSON.Decimal128;
  name?: string;
  neighborhood_overview?: string;
  notes?: string;
  number_of_reviews?: number;
  price?: Realm.BSON.Decimal128;
  property_type?: string;
  review_scores?: ListingsAndReview_review_scores;
  reviews: Realm.List<ListingsAndReview_reviews>;
  room_type?: string;
  security_deposit?: Realm.BSON.Decimal128;
  space?: string;
  summary?: string;
  transit?: string;
  weekly_price?: Realm.BSON.Decimal128;

  static schema = listingsAndReviewSchema;
}

export const listingsAndReview_addressSchema: Realm.ObjectSchema = {
  name: "listingsAndReview_address",
  embedded: true,
  properties: {
    country: "string?",
    country_code: "string?",
    government_area: "string?",
    location: "listingsAndReview_address_location",
    market: "string?",
    street: "string?",
    suburb: "string?",
  },
};

export class ListingsAndReview_address extends Realm.Object<ListingsAndReview_address> {
  country?: string;
  country_code?: string;
  government_area?: string;
  location?: ListingsAndReview_address_location;
  market?: string;
  street?: string;
  suburb?: string;

  static schema = listingsAndReview_addressSchema;
}

export const listingsAndReview_address_locationSchema: Realm.ObjectSchema = {
  name: "listingsAndReview_address_location",
  embedded: true,
  properties: {
    coordinates: "double[]",
    is_location_exact: "bool?",
    type: "string?",
  },
};

export class ListingsAndReview_address_location extends Realm.Object<ListingsAndReview_address_location> {
  coordinates!: Realm.List<number>;
  is_location_exact?: boolean;
  type?: string;

  static schema = listingsAndReview_address_locationSchema;
}

export const listingsAndReview_availabilitySchema: Realm.ObjectSchema = {
  name: "listingsAndReview_availability",
  embedded: true,
  properties: {
    availability_30: "int?",
    availability_365: "int?",
    availability_60: "int?",
    availability_90: "int?",
  },
};

export class ListingsAndReview_availability extends Realm.Object<ListingsAndReview_availability> {
  availability_30?: number;
  availability_365?: number;
  availability_60?: number;
  availability_90?: number;

  static schema = listingsAndReview_availabilitySchema;
}

export const listingsAndReview_hostSchema: Realm.ObjectSchema = {
  name: "listingsAndReview_host",
  embedded: true,
  properties: {
    host_about: "string?",
    host_has_profile_pic: "bool?",
    host_id: "string?",
    host_identity_verified: "bool?",
    host_is_superhost: "bool?",
    host_listings_count: "int?",
    host_location: "string?",
    host_name: "string?",
    host_neighbourhood: "string?",
    host_picture_url: "string?",
    host_response_rate: "int?",
    host_response_time: "string?",
    host_thumbnail_url: "string?",
    host_total_listings_count: "int?",
    host_url: "string?",
    host_verifications: "string[]",
  },
};

export class ListingsAndReview_host extends Realm.Object<ListingsAndReview_host> {
  host_about?: string;
  host_has_profile_pic?: boolean;
  host_id?: string;
  host_identity_verified?: boolean;
  host_is_superhost?: boolean;
  host_listings_count?: number;
  host_location?: string;
  host_name?: string;
  host_neighbourhood?: string;
  host_picture_url?: string;
  host_response_rate?: number;
  host_response_time?: string;
  host_thumbnail_url?: string;
  host_total_listings_count?: number;
  host_url?: string;
  host_verifications!: Realm.List<string>;

  static schema = listingsAndReview_hostSchema;
}

export const listingsAndReview_imagesSchema: Realm.ObjectSchema = {
  name: "listingsAndReview_images",
  embedded: true,
  properties: {
    medium_url: "string?",
    picture_url: "string?",
    thumbnail_url: "string?",
    xl_picture_url: "string?",
  },
};

export class ListingsAndReview_images extends Realm.Object<ListingsAndReview_images> {
  medium_url?: string;
  picture_url?: string;
  thumbnail_url?: string;
  xl_picture_url?: string;

  static schema = listingsAndReview_imagesSchema;
}

export const listingsAndReview_review_scoresSchema: Realm.ObjectSchema = {
  name: "listingsAndReview_review_scores",
  embedded: true,
  properties: {
    review_scores_accuracy: "int?",
    review_scores_checkin: "int?",
    review_scores_cleanliness: "int?",
    review_scores_communication: "int?",
    review_scores_location: "int?",
    review_scores_rating: "int?",
    review_scores_value: "int?",
  },
};

export class ListingsAndReview_review_scores extends Realm.Object<ListingsAndReview_review_scores> {
  review_scores_accuracy?: number;
  review_scores_checkin?: number;
  review_scores_cleanliness?: number;
  review_scores_communication?: number;
  review_scores_location?: number;
  review_scores_rating?: number;
  review_scores_value?: number;

  static schema = listingsAndReview_review_scoresSchema;
}

export const listingsAndReview_reviewsSchema: Realm.ObjectSchema = {
  name: "listingsAndReview_reviews",
  embedded: true,
  properties: {
    _id: "string?",
    comments: "string?",
    date: "date?",
    listing_id: "string?",
    reviewer_id: "string?",
    reviewer_name: "string?",
  },
};

export class ListingsAndReview_reviews extends Realm.Object<ListingsAndReview_reviews> {
  _id?: string;
  comments?: string;
  date?: Date;
  listing_id?: string;
  reviewer_id?: string;
  reviewer_name?: string;

  static schema = listingsAndReview_reviewsSchema;
}

export const syncedModels = [
  ListingsAndReview,
  ListingsAndReview_address,
  ListingsAndReview_address_location,
  ListingsAndReview_availability,
  ListingsAndReview_host,
  ListingsAndReview_images,
  ListingsAndReview_review_scores,
  ListingsAndReview_reviews,
];
