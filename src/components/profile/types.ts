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
    created_at: string;
} 