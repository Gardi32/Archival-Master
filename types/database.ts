export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type MaterialStatus = 'searching' | 'screener_received' | 'approved' | 'order_sent' | 'purchased'
export type CostUnit = 'per_sec' | 'per_min' | 'flat'
export type RightsType = 'free' | 'licensed' | 'restricted' | 'unknown'
export type ProjectStatus = 'active' | 'archived' | 'completed'
export type MemberRole = 'admin' | 'editor' | 'viewer'
export type OrderStatus = 'draft' | 'sent' | 'confirmed' | 'paid'
export type DocumentType = 'contract' | 'invoice' | 'receipt' | 'other'
export type EdlFormat = 'cmx3600' | 'fcp_xml' | 'premiere_xml' | 'csv'
export type BudgetStatus = 'draft' | 'approved' | 'sent'

export interface Project {
  id: string
  name: string
  client: string | null
  description: string | null
  status: ProjectStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface Provider {
  id: string
  project_id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  notes: string | null
  created_at: string
}

export interface Material {
  id: string
  project_id: string
  provider_id: string | null
  code: string | null
  title: string
  description: string | null
  duration_sec: number | null
  format: string | null
  resolution: string | null
  fps: number | null
  aspect_ratio: string | null
  timecode_in: string | null
  timecode_out: string | null
  rights_type: RightsType
  cost_amount: number | null
  cost_currency: string
  cost_unit: CostUnit
  link: string | null
  screener_url: string | null
  status: MaterialStatus
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  provider?: Provider
  frames?: MaterialFrame[]
}

export interface MaterialFrame {
  id: string
  material_id: string
  storage_path: string
  order_index: number
  created_at: string
}

export interface EdlImport {
  id: string
  project_id: string
  name: string
  format: EdlFormat
  raw_content: string | null
  imported_at: string
  clips?: EdlClip[]
}

export interface EdlClip {
  id: string
  edl_import_id: string
  material_id: string | null
  clip_name: string
  record_in: string
  record_out: string
  source_in: string | null
  source_out: string | null
  duration_sec: number
  reel: string | null
  // joined
  material?: Material
}

export interface Budget {
  id: string
  project_id: string
  edl_import_id: string | null
  name: string
  total_amount: number
  currency: string
  status: BudgetStatus
  created_at: string
  items?: BudgetItem[]
}

export interface BudgetItem {
  id: string
  budget_id: string
  material_id: string
  edl_clip_id: string | null
  duration_sec: number | null
  unit_cost: number
  total: number
  material?: Material
}

export interface Order {
  id: string
  project_id: string
  provider_id: string
  budget_id: string | null
  status: OrderStatus
  sent_at: string | null
  notes: string | null
  created_at: string
  provider?: Provider
  items?: OrderItem[]
  documents?: Document[]
}

export interface OrderItem {
  id: string
  order_id: string
  material_id: string
  edl_clip_id: string | null
  duration_sec: number | null
  cost: number
  material?: Material
}

export interface Document {
  id: string
  project_id: string
  order_id: string | null
  type: DocumentType
  filename: string
  storage_path: string
  uploaded_at: string
  notes: string | null
  order?: Order
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: MemberRole
  invited_at: string
  email?: string
}

export interface Database {
  public: {
    Tables: {
      projects: { Row: Project; Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Project> }
      providers: { Row: Provider; Insert: Omit<Provider, 'id' | 'created_at'>; Update: Partial<Provider> }
      materials: { Row: Material; Insert: Omit<Material, 'id' | 'created_at' | 'updated_at' | 'provider' | 'frames'>; Update: Partial<Material> }
      material_frames: { Row: MaterialFrame; Insert: Omit<MaterialFrame, 'id' | 'created_at'>; Update: Partial<MaterialFrame> }
      edl_imports: { Row: EdlImport; Insert: Omit<EdlImport, 'id' | 'clips'>; Update: Partial<EdlImport> }
      edl_clips: { Row: EdlClip; Insert: Omit<EdlClip, 'id' | 'material'>; Update: Partial<EdlClip> }
      budgets: { Row: Budget; Insert: Omit<Budget, 'id' | 'created_at' | 'items'>; Update: Partial<Budget> }
      budget_items: { Row: BudgetItem; Insert: Omit<BudgetItem, 'id' | 'material'>; Update: Partial<BudgetItem> }
      orders: { Row: Order; Insert: Omit<Order, 'id' | 'created_at' | 'provider' | 'items' | 'documents'>; Update: Partial<Order> }
      order_items: { Row: OrderItem; Insert: Omit<OrderItem, 'id' | 'material'>; Update: Partial<OrderItem> }
      documents: { Row: Document; Insert: Omit<Document, 'id' | 'uploaded_at' | 'order'>; Update: Partial<Document> }
      project_members: { Row: ProjectMember; Insert: Omit<ProjectMember, 'id' | 'invited_at'>; Update: Partial<ProjectMember> }
    }
  }
}
