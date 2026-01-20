export interface Profile {
    id: string;
    user_type: 'SINGLE' | 'MATCHMAKR' | 'VENDOR';
    name: string | null;
    sex: string | null;
    birth_year: number | null;
    profile_pic_url: string | null;
    bio: string | null;
    occupation: string | null;
    location: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    photos: (string | null)[] | null;
    business_name: string | null;
    industry: string | null;
    offer: string | null;
    sponsored_by_id: string | null;
    matchmakr_endorsement: string | null;
    street_address: string | null;
    address_line_2: string | null;
    introduction_signal: any | null; // JSONB: IntroductionSignal
    pairings_signal: any | null; // JSONB: PairingsSignal
    created_at: string;
}

export interface VendorProfile {
    id: string;
    business_name: string;
    industry: string;
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
    photos: string[];
    created_at: string;
}

export interface Offer {
    id: string;
    vendor_id: string;
    title: string;
    description: string;
    duration_days: number;
    created_at: string;
    expires_at: string;
    claim_count: number;
    is_active: boolean;
    photos: string[];
}

export interface CreateOfferData {
    title: string;
    description: string;
    duration_days: number;
    photos: string[];
}

export interface ClaimedOffer {
    id: string;
    offer_id: string;
    user_id: string;
    claimed_at: string;
    redeemed_at: string | null;
} 