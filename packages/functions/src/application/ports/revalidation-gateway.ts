export interface RevalidateRequest {
  readonly paths?: readonly string[];
  readonly tags?: readonly string[];
}

export interface RevalidateResponse {
  readonly success: boolean;
  readonly data?: {
    readonly revalidated: number;
    readonly failed: number;
    readonly errors: readonly string[];
  };
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: readonly unknown[];
    readonly requestId: string;
  };
}

export interface RevalidationResult {
  readonly ok: boolean;
  readonly response?: RevalidateResponse;
}

export interface RevalidationGateway {
  revalidate(request: RevalidateRequest): Promise<RevalidationResult>;
}
