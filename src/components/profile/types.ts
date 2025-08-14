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
    created_at: string;
} 