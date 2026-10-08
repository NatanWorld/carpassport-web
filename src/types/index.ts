export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  is_vip: boolean
  created_at: string
}

export interface Car {
  id: string
  owner_id: string
  brand: string
  model: string
  year: number
  nickname: string | null
  color: string | null
  car_country: string
  photo_url: string | null
  is_primary: boolean
  is_public: boolean
  active: boolean
  trip_count: number
  created_at: string
}

export interface TripLog {
  id: string
  car_id: string
  owner_id: string
  place_name: string
  city: string | null
  state: string | null
  country: string
  latitude: number | null
  longitude: number | null
  altitude: number | null
  photo_url: string | null
  notes: string | null
  created_at: string
}

export interface Badge {
  id: string
  code: string
  emoji: string
  name_pt: string
  name_en: string | null
  condition_type: string
  condition_value: number
  is_car_badge: boolean
  points: number
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  car_id: string | null
  earned_at: string
  master_badges: Badge
}
