-- Add async AI processing support for shipment packets

alter table shipment_packets
add column if not exists processing_status text default 'completed',
add column if not exists processing_error text,
add column if not exists processing_started_at timestamptz,
add column if not exists processing_completed_at timestamptz,
add column if not exists ai_model_name text,
add column if not exists parser_provider text;

-- Add parser/classification fields for uploaded documents

alter table packet_documents
add column if not exists parser_status text default 'pending',
add column if not exists parser_provider text,
add column if not exists extracted_markdown text,
add column if not exists extracted_json jsonb,
add column if not exists ai_classification jsonb,
add column if not exists classification_confidence numeric;

-- Add richer AI evidence support for billing blockers

alter table billing_blockers
add column if not exists category text,
add column if not exists evidence jsonb default '[]'::jsonb;

-- Add async AI processing support for shipment packets

alter table shipment_packets
add column if not exists processing_status text default 'completed',
add column if not exists processing_error text,
add column if not exists processing_started_at timestamptz,
add column if not exists processing_completed_at timestamptz,
add column if not exists ai_model_name text,
add column if not exists parser_provider text;

-- Add parser/classification fields for uploaded shipment documents

alter table shipment_documents
add column if not exists parser_status text default 'pending',
add column if not exists parser_provider text,
add column if not exists extracted_markdown text,
add column if not exists extracted_json jsonb,
add column if not exists ai_classification jsonb,
add column if not exists classification_confidence numeric;

-- Add richer AI evidence support for billing blockers

alter table billing_blockers
add column if not exists category text,
add column if not exists evidence jsonb default '[]'::jsonb;