// Hand-written types matching 001_initial_schema.sql
// Regenerate with: npx supabase gen types typescript --project-id fzbqvopmlizieegapixf > src/types/database.ts

export type ReadingStatus = "want_to_read" | "currently_reading" | "read";
export type EventType =
  | "started_reading"
  | "finished_reading"
  | "reviewed"
  | "rated"
  | "added_to_library"
  | "created_list";
export type ImportSource = "goodreads";
export type ImportStatus = "pending" | "processing" | "completed" | "failed";
export type ImportRowStatus = "pending" | "matched" | "unmatched" | "skipped";
export type MatchMethod = "isbn" | "title_author" | "manual";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          reading_goal_year: number | null;
          reading_goal_count: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          reading_goal_year?: number | null;
          reading_goal_count?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          reading_goal_year?: number | null;
          reading_goal_count?: number | null;
          updated_at?: string;
        };
      };
      books: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          description: string | null;
          cover_url: string | null;
          page_count: number | null;
          published_date: string | null;
          language: string | null;
          isbn_10: string | null;
          isbn_13: string | null;
          google_books_id: string | null;
          open_library_id: string | null;
          genres: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          subtitle?: string | null;
          description?: string | null;
          cover_url?: string | null;
          page_count?: number | null;
          published_date?: string | null;
          language?: string | null;
          isbn_10?: string | null;
          isbn_13?: string | null;
          google_books_id?: string | null;
          open_library_id?: string | null;
          genres?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          subtitle?: string | null;
          description?: string | null;
          cover_url?: string | null;
          page_count?: number | null;
          published_date?: string | null;
          language?: string | null;
          isbn_10?: string | null;
          isbn_13?: string | null;
          google_books_id?: string | null;
          open_library_id?: string | null;
          genres?: string[] | null;
          updated_at?: string;
        };
      };
      authors: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
      };
      book_authors: {
        Row: {
          book_id: string;
          author_id: string;
        };
        Insert: {
          book_id: string;
          author_id: string;
        };
        Update: {
          book_id?: string;
          author_id?: string;
        };
      };
      user_books: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          status: ReadingStatus;
          rating: number | null;
          date_started: string | null;
          date_finished: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          status: ReadingStatus;
          rating?: number | null;
          date_started?: string | null;
          date_finished?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: ReadingStatus;
          rating?: number | null;
          date_started?: string | null;
          date_finished?: string | null;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          user_book_id: string | null;
          text: string;
          is_private: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          user_book_id?: string | null;
          text: string;
          is_private?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          text?: string;
          is_private?: boolean;
          updated_at?: string;
        };
      };
      activity_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: EventType;
          book_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: EventType;
          book_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: never;
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: never;
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          event_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          event_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
      lists: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          is_public?: boolean;
          updated_at?: string;
        };
      };
      list_books: {
        Row: {
          list_id: string;
          book_id: string;
          position: number;
        };
        Insert: {
          list_id: string;
          book_id: string;
          position?: number;
        };
        Update: {
          position?: number;
        };
      };
      imports: {
        Row: {
          id: string;
          user_id: string;
          source: ImportSource;
          status: ImportStatus;
          total_rows: number | null;
          matched_rows: number | null;
          unmatched_rows: number | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: ImportSource;
          status?: ImportStatus;
          total_rows?: number | null;
          matched_rows?: number | null;
          unmatched_rows?: number | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          status?: ImportStatus;
          total_rows?: number | null;
          matched_rows?: number | null;
          unmatched_rows?: number | null;
          completed_at?: string | null;
        };
      };
      import_rows: {
        Row: {
          id: string;
          import_id: string;
          raw_data: Record<string, unknown>;
          matched_book_id: string | null;
          match_method: MatchMethod | null;
          match_confidence: number | null;
          status: ImportRowStatus;
        };
        Insert: {
          id?: string;
          import_id: string;
          raw_data: Record<string, unknown>;
          matched_book_id?: string | null;
          match_method?: MatchMethod | null;
          match_confidence?: number | null;
          status?: ImportRowStatus;
        };
        Update: {
          matched_book_id?: string | null;
          match_method?: MatchMethod | null;
          match_confidence?: number | null;
          status?: ImportRowStatus;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      reading_status: ReadingStatus;
      event_type: EventType;
      import_source: ImportSource;
      import_status: ImportStatus;
      import_row_status: ImportRowStatus;
      match_method: MatchMethod;
    };
  };
};

// Convenience row types
export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type BookRow = Database["public"]["Tables"]["books"]["Row"];
export type UserBookRow = Database["public"]["Tables"]["user_books"]["Row"];
export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
export type ActivityEventRow =
  Database["public"]["Tables"]["activity_events"]["Row"];
