
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "admission_cutoffs": {
                  Row: {
                    "call_number": number | null,"course_id": number,"edition_term": number | null,"edition_year": number,"id": number,"metric": string,"quota_code": string,"quota_label": string,"route": string,"scholarship": string | null,"score": number,"source_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "call_number"?: number | null,"course_id": number,"edition_term"?: number | null,"edition_year": number,"id"?: never,"metric": string,"quota_code": string,"quota_label": string,"route": string,"scholarship"?: string | null,"score": number,"source_id": number
                  }
                  Update: {
                    "call_number"?: number | null,"course_id"?: number,"edition_term"?: number | null,"edition_year"?: number,"id"?: never,"metric"?: string,"quota_code"?: string,"quota_label"?: string,"route"?: string,"scholarship"?: string | null,"score"?: number,"source_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "admission_cutoffs_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "admission_cutoffs_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"cine_areas": {
                  Row: {
                    "code": string,"name": string,"parent_code": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"name": string,"parent_code"?: string | null
                  }
                  Update: {
                    "code"?: string,"name"?: string,"parent_code"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cine_areas_parent_code_fkey"
      columns: ["parent_code"]
isOneToOne: false
      referencedRelation: "cine_areas"
      referencedColumns: ["code"]
    }
                  ]
                },"courses": {
                  Row: {
                    "campus_name": string | null,"city": string,"degree": string | null,"duration_years": number | null,"id": number,"inep_code": number,"institution_id": number,"name": string,"profession_id": number | null,"shift": string | null,"source_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "campus_name"?: string | null,"city": string,"degree"?: string | null,"duration_years"?: number | null,"id"?: never,"inep_code": number,"institution_id": number,"name": string,"profession_id"?: number | null,"shift"?: string | null,"source_id": number
                  }
                  Update: {
                    "campus_name"?: string | null,"city"?: string,"degree"?: string | null,"duration_years"?: number | null,"id"?: never,"inep_code"?: number,"institution_id"?: number,"name"?: string,"profession_id"?: number | null,"shift"?: string | null,"source_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "courses_institution_id_fkey"
      columns: ["institution_id"]
isOneToOne: false
      referencedRelation: "institutions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "courses_profession_id_fkey"
      columns: ["profession_id"]
isOneToOne: false
      referencedRelation: "professions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "courses_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"curriculum_subjects": {
                  Row: {
                    "course_id": number,"hours": number | null,"id": number,"is_elective": boolean | null,"name": string,"source_id": number,"term": number | null,"term_to": number | null,"year": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": number,"hours"?: number | null,"id"?: never,"is_elective"?: boolean | null,"name": string,"source_id": number,"term"?: number | null,"term_to"?: number | null,"year"?: number | null
                  }
                  Update: {
                    "course_id"?: number,"hours"?: number | null,"id"?: never,"is_elective"?: boolean | null,"name"?: string,"source_id"?: number,"term"?: number | null,"term_to"?: number | null,"year"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "curriculum_subjects_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "curriculum_subjects_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"institutions": {
                  Row: {
                    "id": number,"inep_code": number,"kind": string,"logo_license": string | null,"logo_source_url": string | null,"logo_url": string | null,"name": string,"photo_credit": string | null,"photo_license": string | null,"photo_source_url": string | null,"photo_url": string | null,"short_name": string | null,"source_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"inep_code": number,"kind": string,"logo_license"?: string | null,"logo_source_url"?: string | null,"logo_url"?: string | null,"name": string,"photo_credit"?: string | null,"photo_license"?: string | null,"photo_source_url"?: string | null,"photo_url"?: string | null,"short_name"?: string | null,"source_id": number
                  }
                  Update: {
                    "id"?: never,"inep_code"?: number,"kind"?: string,"logo_license"?: string | null,"logo_source_url"?: string | null,"logo_url"?: string | null,"name"?: string,"photo_credit"?: string | null,"photo_license"?: string | null,"photo_source_url"?: string | null,"photo_url"?: string | null,"short_name"?: string | null,"source_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "institutions_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"professions": {
                  Row: {
                    "area_code": string | null,"cine_code": string,"id": number,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area_code"?: never,"cine_code": string,"id"?: never,"name": string,"slug": string
                  }
                  Update: {
                    "area_code"?: never,"cine_code"?: string,"id"?: never,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "professions_area_code_fkey"
      columns: ["area_code"]
isOneToOne: false
      referencedRelation: "cine_areas"
      referencedColumns: ["code"]
    }
                  ]
                },"scrape_runs": {
                  Row: {
                    "adapter": string,"error": string | null,"finished_at": string | null,"id": number,"rows_written": number | null,"started_at": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "adapter": string,"error"?: string | null,"finished_at"?: string | null,"id"?: never,"rows_written"?: number | null,"started_at"?: string,"status"?: string
                  }
                  Update: {
                    "adapter"?: string,"error"?: string | null,"finished_at"?: string | null,"id"?: never,"rows_written"?: number | null,"started_at"?: string,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sources": {
                  Row: {
                    "adapter": string,"created_at": string,"id": number,"label": string,"last_content_hash": string | null,"last_fetched_at": string | null,"refresh_interval": string,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "adapter": string,"created_at"?: string,"id"?: never,"label": string,"last_content_hash"?: string | null,"last_fetched_at"?: string | null,"refresh_interval"?: string,"url": string
                  }
                  Update: {
                    "adapter"?: string,"created_at"?: string,"id"?: never,"label"?: string,"last_content_hash"?: string | null,"last_fetched_at"?: string | null,"refresh_interval"?: string,"url"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
