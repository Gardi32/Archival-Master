export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type MaterialStatus = 'searching' | 'screener_received' | 'approved' | 'order_sent' | 'purchased'
export type CostUnit = 'per_sec' | 'per_min' | 'flat'
export type RightsType = 'free' | 'licensed' | 'restricted' | 'unknown'
export type ProjectStatus = 'active' | 'archived' | 'completed'
export type MemberRole = 'admin' | 'editor' | 'viewer'
export type OrderStatus = 'draft' | 'sent' | 'confirmed' | 'paid'
export type DocumentType = 'contract' | 'invoice' | 'receipt' | 'script' | 'brief' | 'storyboard' | 'other'
export type GanttTaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskUrgency = 'low' | 'medium' | 'high' | 'immediate'
export type TaskStatus = 'pending' | 'in_progress' | 'done'
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
  name: string
  code: string | null        // 3-letter identifier e.g. "GET", "AFP"
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  rates?: ProviderRate[]
}

export interface ProviderRate {
  id: string
  provider_id: string
  project_id: string | null   // null = global rate
  label: string
  rate_value: number | null
  rate_timing: string | null
  rate_variables: string | null
  effective_date: string | null
  notes: string | null
  created_at: string
}

export interface ProjectProvider {
  project_id: string
  provider_id: string
  added_at: string
}

export interface Material {
  id: string
  project_id: string
  provider_id: string | null
  provider_rate_id: string | null
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
  entry_code: string | null     // auto-assigned 4-digit sequential: 0001, 0002...
  original_id: string | null   // supplier's original clip/asset ID
  tags: string | null
  material_type: string | null  // video | foto | grafico | social_media | audio | otro
  file_quality: string | null   // HQD | SCR
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
  provider_rate?: ProviderRate
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
  provider_rate_id: string | null
  clip_name: string
  record_in: string
  record_out: string
  source_in: string | null
  source_out: string | null
  duration_sec: number
  reel: string | null
  // joined
  material?: Material
  provider_rate?: ProviderRate
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

export interface ResearchItem {
  id: string
  project_id: string
  id_number: number | null
  shot_code: string | null
  subject: string
  date: string | null          // ISO date YYYY-MM-DD
  ep: string | null
  scene: string | null
  supplier_name: string | null
  delivery_timing: string | null
  location: string | null
  provider_id: string | null
  provider_rate_id: string | null
  file_type: string | null     // SOURCE ON LINE VIDEO | REQUESTED GRAPHIC | REQUESTED VIDEO
  file_quality: string | null  // HQD | SCR
  screener_filename: string | null
  supplier_clip_id: string | null
  description: string | null
  log: string | null
  link_scr: string | null
  tags: string | null
  usd_cost: number | null
  special_conditions: string | null
  send_scr: boolean
  support_supplier: string | null
  image_voice_rights: string | null
  rights_supplier: string | null
  other_rights: string | null
  media: string | null
  territory: string | null
  duration_rights: string | null
  in_context_promo: boolean
  created_at: string
  updated_at: string
}

export interface LogEntry {
  id: string
  project_id: string
  entry_date: string   // ISO date YYYY-MM-DD
  content: string
  link: string | null
  created_at: string
  updated_at: string
  // joined
  research_links?: LogEntryResearchLink[]
}

export interface LogEntryResearchLink {
  log_entry_id: string
  research_item_id: string
  // joined
  research_item?: ResearchItem
}

export interface ProjectTask {
  id: string
  project_id: string
  title: string
  description: string | null
  priority: TaskPriority
  urgency: TaskUrgency
  due_date: string | null
  status: TaskStatus
  assignee: string | null
  created_at: string
  updated_at: string
}

export interface GanttTask {
  id: string
  project_id: string
  title: string
  description: string | null
  start_date: string   // YYYY-MM-DD
  end_date: string     // YYYY-MM-DD
  color: string | null
  parent_id: string | null
  order_index: number
  status: GanttTaskStatus
  assignee: string | null
  created_at: string
  updated_at: string
  // virtual
  children?: GanttTask[]
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
      providers: { Row: Provider; Insert: Omit<Provider, 'id' | 'created_at' | 'rates'>; Update: Partial<Provider> }
      provider_rates: { Row: ProviderRate; Insert: Omit<ProviderRate, 'id' | 'created_at'>; Update: Partial<ProviderRate> }
      project_providers: { Row: ProjectProvider; Insert: ProjectProvider; Update: Partial<ProjectProvider> }
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
      research_items: { Row: ResearchItem; Insert: Omit<ResearchItem, 'id' | 'created_at' | 'updated_at'>; Update: Partial<ResearchItem> }
      log_entries: { Row: LogEntry; Insert: Omit<LogEntry, 'id' | 'created_at' | 'updated_at' | 'research_links'>; Update: Partial<LogEntry> }
      log_entry_research_links: { Row: LogEntryResearchLink; Insert: LogEntryResearchLink; Update: never }
      gantt_tasks: { Row: GanttTask; Insert: Omit<GanttTask, 'id' | 'created_at' | 'updated_at' | 'children'>; Update: Partial<GanttTask> }
      project_tasks: { Row: ProjectTask; Insert: Omit<ProjectTask, 'id' | 'created_at' | 'updated_at'>; Update: Partial<ProjectTask> }
    }
  }
}
