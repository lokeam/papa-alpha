import { createClient } from '@supabase/supabase-js';
import { DatabaseError } from '@/app/lib/utils/error-handler';

// JSON types for JSONB columns
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];

export interface Document {
  id: string;
  filename: string;
  storage_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  small_business_accessible?: boolean;
  small_business_reasoning?: string;
  identified_risks?: JsonObject;
  clarifying_questions?: JsonObject;
  subcontracting_opportunities?: JsonObject;
  raw_llm_response?: JsonObject;
  error_message?: string;
  created_at: string;
  updated_at: string;
  analyzed_at?: string;
};

export interface CreateDocumentInput {
  filename: string;
  storage_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ActiveJob {
  id: string;
  filename: string;
  status: 'pending' | 'processing';
  created_at: string;
}

const ZERO_OR_MULTIPLE_ROW_ERROR_CODE = 'PGRST116';
const DOCUMENTS_TABLE = 'documents';
const DOCUMENTS_TABLE_ID_COL = 'id';
const UNEXPECTED_DB_ERROR_MSG = 'Unexpected database error';


export class DocumentRepository {
  private client;

  constructor() {
    this.client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async create(data: CreateDocumentInput): Promise<Document> {
    try {
      const { data: document, error } = await this.client
        .from(DOCUMENTS_TABLE)
        .insert(data)
        .select()
        .single();

      if (error) {
        throw new DatabaseError('Failed to create document', error);
      }

      return document;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(UNEXPECTED_DB_ERROR_MSG, error);
    }
  }

  async findActiveJob(): Promise<ActiveJob | null> {
    try {
      const { data, error } = await this.client
        .from(DOCUMENTS_TABLE)
        .select('id, filename, status, created_at')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new DatabaseError('Failed to find active job', error);
      }

      return data;
    } catch(error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(UNEXPECTED_DB_ERROR_MSG, error);
    }
  }


  async findById(id: string): Promise<Document | null> {
    try {
      const { data, error } = await this.client
        .from(DOCUMENTS_TABLE)
        .select()
        .eq(DOCUMENTS_TABLE_ID_COL, id)
        .single();

      if (error) {
        if (error.code === ZERO_OR_MULTIPLE_ROW_ERROR_CODE) return null;

        throw new DatabaseError('Failed to find document', error);
      }

      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;

      throw new DatabaseError(UNEXPECTED_DB_ERROR_MSG, error);
    }
  }


  async updateStatus(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<Document> {
    try {
      const { data, error } = await this.client
        .from(DOCUMENTS_TABLE)
        .update({ status, updated_at: new Date().toISOString() })
        .eq(DOCUMENTS_TABLE_ID_COL, id)
        .select()
        .single();

      if (error) {
        throw new DatabaseError('Failed to update document status', error);
      }

      return data;
    } catch(error) {
      if (error instanceof DatabaseError) throw error;

      throw new DatabaseError(UNEXPECTED_DB_ERROR_MSG, error);
    }
  }

  async findLatestCompleted(): Promise<Document | null> {
    try {
      const { data, error } = await this.client
        .from(DOCUMENTS_TABLE)
        .select()
        .eq('status', 'completed')
        .not('analysis_results', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new DatabaseError('Failed to find latest completed document', error);
      }

      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(UNEXPECTED_DB_ERROR_MSG, error);
    }
  }
}