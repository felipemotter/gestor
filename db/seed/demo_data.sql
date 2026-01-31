-- =============================================================================
-- Demo Data for Gestor
-- Insere usuarios, familias, contas, categorias, tags, transacoes e regras
-- Usa datas relativas a CURRENT_DATE para dados sempre atualizados
-- =============================================================================

-- Desabilitar triggers de RLS para inserir dados diretamente
SET session_replication_role = 'replica';

DO $$
DECLARE
  -- User UUIDs (fixos para reprodutibilidade)
  v_demo_uid    uuid := 'a0000000-0000-0000-0000-000000000001';
  v_joao_uid    uuid := 'a0000000-0000-0000-0000-000000000002';
  v_maria_uid   uuid := 'a0000000-0000-0000-0000-000000000003';

  -- Family UUIDs
  v_demo_fam    uuid := 'f0000000-0000-0000-0000-000000000001';
  v_silva_fam   uuid := 'f0000000-0000-0000-0000-000000000002';

  -- Account UUIDs (Familia Silva)
  v_acc_nubank  uuid := 'c0000000-0000-0000-0000-000000000001';
  v_acc_itau    uuid := 'c0000000-0000-0000-0000-000000000002';
  v_acc_nucc    uuid := 'c0000000-0000-0000-0000-000000000003';
  v_acc_caixa   uuid := 'c0000000-0000-0000-0000-000000000004';
  v_acc_wallet  uuid := 'c0000000-0000-0000-0000-000000000005';

  -- Account UUID (Demo)
  v_acc_demo    uuid := 'c0000000-0000-0000-0000-000000000010';

  -- Category UUIDs - Expense parents
  v_cat_moradia     uuid := 'd0000000-0000-0000-0000-000000000001';
  v_cat_alimentacao uuid := 'd0000000-0000-0000-0000-000000000002';
  v_cat_transporte  uuid := 'd0000000-0000-0000-0000-000000000003';
  v_cat_saude       uuid := 'd0000000-0000-0000-0000-000000000004';
  v_cat_educacao    uuid := 'd0000000-0000-0000-0000-000000000005';
  v_cat_lazer       uuid := 'd0000000-0000-0000-0000-000000000006';
  v_cat_vestuario   uuid := 'd0000000-0000-0000-0000-000000000007';
  v_cat_outros      uuid := 'd0000000-0000-0000-0000-000000000008';

  -- Category UUIDs - Expense children
  v_cat_aluguel       uuid := 'd1000000-0000-0000-0000-000000000001';
  v_cat_condominio    uuid := 'd1000000-0000-0000-0000-000000000002';
  v_cat_energia       uuid := 'd1000000-0000-0000-0000-000000000003';
  v_cat_agua          uuid := 'd1000000-0000-0000-0000-000000000004';
  v_cat_internet      uuid := 'd1000000-0000-0000-0000-000000000005';
  v_cat_supermercado  uuid := 'd1000000-0000-0000-0000-000000000006';
  v_cat_restaurante   uuid := 'd1000000-0000-0000-0000-000000000007';
  v_cat_delivery      uuid := 'd1000000-0000-0000-0000-000000000008';
  v_cat_combustivel   uuid := 'd1000000-0000-0000-0000-000000000009';
  v_cat_uber          uuid := 'd1000000-0000-0000-0000-000000000010';
  v_cat_estacionamento uuid := 'd1000000-0000-0000-0000-000000000011';
  v_cat_farmacia      uuid := 'd1000000-0000-0000-0000-000000000012';
  v_cat_plano_saude   uuid := 'd1000000-0000-0000-0000-000000000013';
  v_cat_escola        uuid := 'd1000000-0000-0000-0000-000000000014';
  v_cat_cursos        uuid := 'd1000000-0000-0000-0000-000000000015';
  v_cat_streaming     uuid := 'd1000000-0000-0000-0000-000000000016';
  v_cat_cinema        uuid := 'd1000000-0000-0000-0000-000000000017';
  v_cat_viagem        uuid := 'd1000000-0000-0000-0000-000000000018';

  -- Category UUIDs - Income
  v_cat_salario     uuid := 'd2000000-0000-0000-0000-000000000001';
  v_cat_freelance   uuid := 'd2000000-0000-0000-0000-000000000002';
  v_cat_rendimentos uuid := 'd2000000-0000-0000-0000-000000000003';

  -- Category UUIDs - Transfer
  v_cat_transferencia uuid := 'd3000000-0000-0000-0000-000000000001';

  -- Tag UUIDs
  v_tag_fixo      uuid := 'e0000000-0000-0000-0000-000000000001';
  v_tag_variavel  uuid := 'e0000000-0000-0000-0000-000000000002';
  v_tag_parcelado uuid := 'e0000000-0000-0000-0000-000000000003';
  v_tag_urgente   uuid := 'e0000000-0000-0000-0000-000000000004';

  -- Import batch UUID
  v_batch_nubank  uuid := 'b0000000-0000-0000-0000-000000000001';

  -- Transaction UUIDs (para poder vincular tags)
  v_tx uuid;

  -- Date helpers
  v_today         date := CURRENT_DATE;
  v_m0            date;  -- inicio do mes atual
  v_m1            date;  -- inicio do mes passado
  v_m2            date;  -- inicio de 2 meses atras

  -- Password hash for 'demo123' (bcrypt, generated via pgcrypto gen_salt('bf',10))
  v_password_hash text := '$2a$10$Iq2RFRTryQTpGtXruxCrKeHryMqiw2SMzUcQ.4KjNIM9VqNirrf5y';

BEGIN
  -- Calcular datas relativas
  v_m0 := date_trunc('month', v_today)::date;
  v_m1 := (date_trunc('month', v_today) - interval '1 month')::date;
  v_m2 := (date_trunc('month', v_today) - interval '2 months')::date;

  -- =========================================================================
  -- USERS (auth.users + auth.identities)
  -- =========================================================================

  -- Demo user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, email_change_token_current, phone_change,
    phone_change_token, reauthentication_token,
    is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_demo_uid, 'authenticated', 'authenticated',
    'demo@demo.com', v_password_hash,
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Demo User"}'::jsonb,
    now(), now(),
    '', '', '',
    '', '', '',
    '', '',
    false, false
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_demo_uid, v_demo_uid, 'demo@demo.com',
    jsonb_build_object('sub', v_demo_uid::text, 'email', 'demo@demo.com'),
    'email', now(), now(), now()
  );

  -- Joao
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, email_change_token_current, phone_change,
    phone_change_token, reauthentication_token,
    is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_joao_uid, 'authenticated', 'authenticated',
    'joao@demo.com', v_password_hash,
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"João Silva"}'::jsonb,
    now(), now(),
    '', '', '',
    '', '', '',
    '', '',
    false, false
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_joao_uid, v_joao_uid, 'joao@demo.com',
    jsonb_build_object('sub', v_joao_uid::text, 'email', 'joao@demo.com'),
    'email', now(), now(), now()
  );

  -- Maria
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, email_change_token_current, phone_change,
    phone_change_token, reauthentication_token,
    is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_maria_uid, 'authenticated', 'authenticated',
    'maria@demo.com', v_password_hash,
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Silva"}'::jsonb,
    now(), now(),
    '', '', '',
    '', '', '',
    '', '',
    false, false
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_maria_uid, v_maria_uid, 'maria@demo.com',
    jsonb_build_object('sub', v_maria_uid::text, 'email', 'maria@demo.com'),
    'email', now(), now(), now()
  );

  -- =========================================================================
  -- FAMILIES + MEMBERSHIPS
  -- =========================================================================

  -- Demo family
  INSERT INTO families (id, name, created_by) VALUES (v_demo_fam, 'Demo', v_demo_uid);
  INSERT INTO memberships (family_id, user_id, role, created_by)
    VALUES (v_demo_fam, v_demo_uid, 'owner', v_demo_uid);

  -- Familia Silva
  INSERT INTO families (id, name, created_by) VALUES (v_silva_fam, 'Família Silva', v_joao_uid);
  INSERT INTO memberships (family_id, user_id, role, created_by)
    VALUES (v_silva_fam, v_joao_uid, 'owner', v_joao_uid);
  INSERT INTO memberships (family_id, user_id, role, created_by)
    VALUES (v_silva_fam, v_maria_uid, 'member', v_joao_uid);

  -- =========================================================================
  -- ACCOUNTS
  -- =========================================================================

  -- Demo account
  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, created_by)
    VALUES (v_acc_demo, v_demo_fam, 'Conta Demo', 'checking', 1000.00, 'logo:banco-inter-s-a', v_demo_uid);

  -- Familia Silva accounts
  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, created_by)
    VALUES (v_acc_nubank, v_silva_fam, 'Nubank Conta Corrente', 'checking', 2500.00, 'logo:nu-pagamentos-s-a', v_joao_uid);

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, created_by)
    VALUES (v_acc_itau, v_silva_fam, 'Itaú Conta Corrente', 'checking', 4200.00, 'logo:itau-unibanco-s-a', v_joao_uid);

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, created_by)
    VALUES (v_acc_nucc, v_silva_fam, 'Nubank Cartão de Crédito', 'credit_card', 0.00, 'logo:nu-pagamentos-s-a', v_joao_uid);

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, created_by)
    VALUES (v_acc_caixa, v_silva_fam, 'Poupança Caixa', 'savings', 15000.00, 'logo:caixa-economica-federal', v_joao_uid);

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, visibility, owner_user_id, icon_key, created_by)
    VALUES (v_acc_wallet, v_silva_fam, 'Carteira João', 'wallet', 300.00, 'private', v_joao_uid, null, v_joao_uid);

  -- =========================================================================
  -- CATEGORIES (Familia Silva)
  -- =========================================================================

  -- Expense parents
  INSERT INTO categories (id, family_id, name, category_type, created_by) VALUES
    (v_cat_moradia,     v_silva_fam, 'Moradia',      'expense', v_joao_uid),
    (v_cat_alimentacao, v_silva_fam, 'Alimentação',   'expense', v_joao_uid),
    (v_cat_transporte,  v_silva_fam, 'Transporte',    'expense', v_joao_uid),
    (v_cat_saude,       v_silva_fam, 'Saúde',         'expense', v_joao_uid),
    (v_cat_educacao,    v_silva_fam, 'Educação',      'expense', v_joao_uid),
    (v_cat_lazer,       v_silva_fam, 'Lazer',         'expense', v_joao_uid),
    (v_cat_vestuario,   v_silva_fam, 'Vestuário',     'expense', v_joao_uid),
    (v_cat_outros,      v_silva_fam, 'Outros',        'expense', v_joao_uid);

  -- Expense children
  INSERT INTO categories (id, family_id, parent_id, name, category_type, created_by) VALUES
    (v_cat_aluguel,        v_silva_fam, v_cat_moradia,     'Aluguel',         'expense', v_joao_uid),
    (v_cat_condominio,     v_silva_fam, v_cat_moradia,     'Condomínio',      'expense', v_joao_uid),
    (v_cat_energia,        v_silva_fam, v_cat_moradia,     'Energia',         'expense', v_joao_uid),
    (v_cat_agua,           v_silva_fam, v_cat_moradia,     'Água',            'expense', v_joao_uid),
    (v_cat_internet,       v_silva_fam, v_cat_moradia,     'Internet',        'expense', v_joao_uid),
    (v_cat_supermercado,   v_silva_fam, v_cat_alimentacao, 'Supermercado',    'expense', v_joao_uid),
    (v_cat_restaurante,    v_silva_fam, v_cat_alimentacao, 'Restaurante',     'expense', v_joao_uid),
    (v_cat_delivery,       v_silva_fam, v_cat_alimentacao, 'Delivery',        'expense', v_joao_uid),
    (v_cat_combustivel,    v_silva_fam, v_cat_transporte,  'Combustível',     'expense', v_joao_uid),
    (v_cat_uber,           v_silva_fam, v_cat_transporte,  'Uber/99',         'expense', v_joao_uid),
    (v_cat_estacionamento, v_silva_fam, v_cat_transporte,  'Estacionamento',  'expense', v_joao_uid),
    (v_cat_farmacia,       v_silva_fam, v_cat_saude,       'Farmácia',        'expense', v_joao_uid),
    (v_cat_plano_saude,    v_silva_fam, v_cat_saude,       'Plano de Saúde',  'expense', v_joao_uid),
    (v_cat_escola,         v_silva_fam, v_cat_educacao,    'Escola',          'expense', v_joao_uid),
    (v_cat_cursos,         v_silva_fam, v_cat_educacao,    'Cursos',          'expense', v_joao_uid),
    (v_cat_streaming,      v_silva_fam, v_cat_lazer,       'Streaming',       'expense', v_joao_uid),
    (v_cat_cinema,         v_silva_fam, v_cat_lazer,       'Cinema',          'expense', v_joao_uid),
    (v_cat_viagem,         v_silva_fam, v_cat_lazer,       'Viagem',          'expense', v_joao_uid);

  -- Income categories
  INSERT INTO categories (id, family_id, name, category_type, created_by) VALUES
    (v_cat_salario,     v_silva_fam, 'Salário',      'income', v_joao_uid),
    (v_cat_freelance,   v_silva_fam, 'Freelance',    'income', v_joao_uid),
    (v_cat_rendimentos, v_silva_fam, 'Rendimentos',  'income', v_joao_uid);

  -- Transfer category
  INSERT INTO categories (id, family_id, name, category_type, created_by) VALUES
    (v_cat_transferencia, v_silva_fam, 'Transferência', 'transfer', v_joao_uid);

  -- =========================================================================
  -- TAGS
  -- =========================================================================

  INSERT INTO tags (id, family_id, name, created_by) VALUES
    (v_tag_fixo,      v_silva_fam, 'Fixo',      v_joao_uid),
    (v_tag_variavel,  v_silva_fam, 'Variável',  v_joao_uid),
    (v_tag_parcelado, v_silva_fam, 'Parcelado', v_joao_uid),
    (v_tag_urgente,   v_silva_fam, 'Urgente',   v_joao_uid);

  -- =========================================================================
  -- IMPORT BATCH (simulando OFX Nubank)
  -- =========================================================================

  INSERT INTO import_batches (id, family_id, source, raw_hash, status, metadata, created_by, processed_at) VALUES
    (v_batch_nubank, v_silva_fam, 'ofx', 'demo_nubank_ofx_hash_001', 'processed',
     '{"bank":"Nubank","account":"Conta Corrente","period":"ultimo_mes"}'::jsonb,
     v_joao_uid, now());

  -- =========================================================================
  -- TRANSACTIONS — Mes 2 meses atras (v_m2)
  -- =========================================================================

  -- Salario Joao - Itau
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_itau, v_cat_salario, 8500.00, v_m2 + 5, 'Salário João - Empresa XYZ', 'manual', v_joao_uid);

  -- Salario Maria - Nubank
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nubank, v_cat_salario, 4200.00, v_m2 + 5, 'Salário Maria - Empresa ABC', 'manual', v_maria_uid);

  -- Aluguel
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_itau, v_cat_aluguel, 2200.00, v_m2 + 10, 'Aluguel apartamento', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Condominio
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_itau, v_cat_condominio, 650.00, v_m2 + 10, 'Condomínio', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Energia
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nubank, v_cat_energia, 185.00, v_m2 + 15, 'CPFL Energia', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Agua
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nubank, v_cat_agua, 95.00, v_m2 + 15, 'SABESP', 'manual', v_joao_uid);

  -- Internet
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nubank, v_cat_internet, 129.90, v_m2 + 12, 'Vivo Fibra', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Supermercado
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nucc, v_cat_supermercado, 892.45, v_m2 + 8, 'Extra Supermercados', 'manual', v_maria_uid);

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nucc, v_cat_supermercado, 345.80, v_m2 + 18, 'Pão de Açúcar', 'manual', v_maria_uid);

  -- Restaurante
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nucc, v_cat_restaurante, 156.00, v_m2 + 14, 'Outback Steakhouse', 'manual', v_joao_uid);

  -- Delivery
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nucc, v_cat_delivery, 67.90, v_m2 + 11, 'iFood - Sushi Leblon', 'manual', v_maria_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  -- Combustivel
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nubank, v_cat_combustivel, 280.00, v_m2 + 7, 'Posto Shell BR-101', 'manual', v_joao_uid);

  -- Uber
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nucc, v_cat_uber, 34.50, v_m2 + 16, 'Uber - Centro → Casa', 'manual', v_maria_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  -- Plano de Saude
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_itau, v_cat_plano_saude, 890.00, v_m2 + 10, 'Unimed - Plano Familiar', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Farmacia
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nucc, v_cat_farmacia, 78.50, v_m2 + 20, 'Drogasil', 'manual', v_maria_uid);

  -- Escola
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_itau, v_cat_escola, 1450.00, v_m2 + 5, 'Colégio São Paulo', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Streaming
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nucc, v_cat_streaming, 55.90, v_m2 + 1, 'Netflix + Spotify', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Transferencia: Itau -> Poupanca
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_itau, v_cat_transferencia, -1000.00, v_m2 + 6, 'Transferência para poupança', 'transfer', v_joao_uid);
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_caixa, v_cat_transferencia, 1000.00, v_m2 + 6, 'Transferência do Itaú', 'transfer', v_joao_uid);

  -- =========================================================================
  -- TRANSACTIONS — Mes passado (v_m1)
  -- =========================================================================

  -- Salario Joao - Itau
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_itau, v_cat_salario, 8500.00, v_m1 + 5, 'Salário João - Empresa XYZ', 'manual', v_joao_uid);

  -- Salario Maria - Nubank
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nubank, v_cat_salario, 4200.00, v_m1 + 5, 'Salário Maria - Empresa ABC', 'manual', v_maria_uid);

  -- Freelance
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nubank, v_cat_freelance, 1500.00, v_m1 + 15, 'Projeto freelance - Site empresa', 'manual', v_joao_uid);

  -- Aluguel
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_itau, v_cat_aluguel, 2200.00, v_m1 + 10, 'Aluguel apartamento', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Condominio
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_itau, v_cat_condominio, 650.00, v_m1 + 10, 'Condomínio', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Energia
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nubank, v_cat_energia, 210.00, v_m1 + 15, 'CPFL Energia', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Agua
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nubank, v_cat_agua, 88.00, v_m1 + 15, 'SABESP', 'manual', v_joao_uid);

  -- Internet
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nubank, v_cat_internet, 129.90, v_m1 + 12, 'Vivo Fibra', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Supermercado
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nucc, v_cat_supermercado, 1045.30, v_m1 + 7, 'Carrefour', 'manual', v_maria_uid);

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nucc, v_cat_supermercado, 278.60, v_m1 + 20, 'Hortifruti', 'manual', v_maria_uid);

  -- Restaurante
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nucc, v_cat_restaurante, 198.00, v_m1 + 13, 'Fogo de Chão', 'manual', v_joao_uid);

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_wallet, v_cat_restaurante, 42.00, v_m1 + 22, 'Pastel da feira', 'manual', v_joao_uid);

  -- Delivery
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nucc, v_cat_delivery, 89.90, v_m1 + 9, 'iFood - Pizza Hut', 'manual', v_maria_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nucc, v_cat_delivery, 52.40, v_m1 + 17, 'iFood - Burger King', 'manual', v_maria_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  -- Combustivel
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nubank, v_cat_combustivel, 310.00, v_m1 + 6, 'Posto Ipiranga', 'manual', v_joao_uid);

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nubank, v_cat_combustivel, 260.00, v_m1 + 21, 'Posto Shell', 'manual', v_joao_uid);

  -- Uber
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nucc, v_cat_uber, 28.70, v_m1 + 11, 'Uber - Shopping → Casa', 'manual', v_maria_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  -- Plano de Saude
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_itau, v_cat_plano_saude, 890.00, v_m1 + 10, 'Unimed - Plano Familiar', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Farmacia
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nucc, v_cat_farmacia, 125.80, v_m1 + 19, 'Droga Raia', 'manual', v_maria_uid);

  -- Escola
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_itau, v_cat_escola, 1450.00, v_m1 + 5, 'Colégio São Paulo', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Streaming
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nucc, v_cat_streaming, 55.90, v_m1 + 1, 'Netflix + Spotify', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Cinema
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nucc, v_cat_cinema, 96.00, v_m1 + 16, 'Cinemark - 2 ingressos + pipoca', 'manual', v_joao_uid);

  -- Estacionamento
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_wallet, v_cat_estacionamento, 25.00, v_m1 + 16, 'Estacionamento shopping', 'manual', v_joao_uid);

  -- Transferencia: Nubank -> Carteira
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nubank, v_cat_transferencia, -200.00, v_m1 + 3, 'Saque para carteira', 'transfer', v_joao_uid);
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_wallet, v_cat_transferencia, 200.00, v_m1 + 3, 'Saque Nubank', 'transfer', v_joao_uid);

  -- Transferencia: Itau -> Poupanca
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_itau, v_cat_transferencia, -1500.00, v_m1 + 6, 'Transferência para poupança', 'transfer', v_joao_uid);
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_caixa, v_cat_transferencia, 1500.00, v_m1 + 6, 'Transferência do Itaú', 'transfer', v_joao_uid);

  -- Rendimentos poupanca
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_caixa, v_cat_rendimentos, 98.50, v_m1 + 1, 'Rendimento poupança', 'manual', v_joao_uid);

  -- =========================================================================
  -- TRANSACTIONS — Mes atual (v_m0)
  -- =========================================================================

  -- Salario Joao - Itau
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_itau, v_cat_salario, 8500.00, v_m0 + 5, 'Salário João - Empresa XYZ', 'manual', v_joao_uid);

  -- Salario Maria - Nubank
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nubank, v_cat_salario, 4200.00, v_m0 + 5, 'Salário Maria - Empresa ABC', 'manual', v_maria_uid);

  -- Aluguel
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_itau, v_cat_aluguel, 2200.00, v_m0 + 10, 'Aluguel apartamento', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Condominio
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_itau, v_cat_condominio, 650.00, v_m0 + 10, 'Condomínio', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Energia
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nubank, v_cat_energia, 195.00, v_m0 + 15, 'CPFL Energia', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Internet
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nubank, v_cat_internet, 129.90, v_m0 + 12, 'Vivo Fibra', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Supermercado
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nucc, v_cat_supermercado, 756.20, v_m0 + 4, 'Atacadão', 'manual', v_maria_uid);

  -- Restaurante
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nucc, v_cat_restaurante, 142.00, v_m0 + 8, 'Madero', 'manual', v_joao_uid);

  -- Delivery
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nucc, v_cat_delivery, 73.50, v_m0 + 6, 'iFood - McDonald''s', 'manual', v_maria_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  -- Combustivel
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nubank, v_cat_combustivel, 295.00, v_m0 + 3, 'Posto BR', 'manual', v_joao_uid);

  -- Plano de Saude
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_itau, v_cat_plano_saude, 890.00, v_m0 + 10, 'Unimed - Plano Familiar', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Escola
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_itau, v_cat_escola, 1450.00, v_m0 + 5, 'Colégio São Paulo', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Streaming
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nucc, v_cat_streaming, 55.90, v_m0 + 1, 'Netflix + Spotify', 'manual', v_joao_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Vestuario
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_nucc, v_cat_vestuario, 389.90, v_m0 + 9, 'Renner - Roupas crianças', 'manual', v_maria_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_parcelado);

  -- Cursos
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nucc, v_cat_cursos, 197.00, v_m0 + 2, 'Alura - Assinatura mensal', 'manual', v_joao_uid);

  -- Uber
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_nucc, v_cat_uber, 22.30, v_m0 + 7, 'Uber - Trabalho → Casa', 'manual', v_maria_uid);

  -- Rendimentos poupanca
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_caixa, v_cat_rendimentos, 105.20, v_m0 + 1, 'Rendimento poupança', 'manual', v_joao_uid);

  -- =========================================================================
  -- OFX-IMPORTED TRANSACTIONS (vinculadas ao import_batch, mes passado)
  -- =========================================================================

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, source_hash, external_id, import_batch_id, created_by)
  VALUES
    (v_acc_nubank, v_cat_supermercado, 234.56, v_m1 + 8,  'PAG*JoseDaSilva',  'ofx', md5('ofx_nu_001'), 'FITID20250101001', v_batch_nubank, v_joao_uid),
    (v_acc_nubank, v_cat_delivery,     45.90,  v_m1 + 10, 'IFOOD *IFOOD',      'ofx', md5('ofx_nu_002'), 'FITID20250101002', v_batch_nubank, v_joao_uid),
    (v_acc_nubank, v_cat_uber,         31.20,  v_m1 + 12, 'UBER *UBER *TRIP',  'ofx', md5('ofx_nu_003'), 'FITID20250101003', v_batch_nubank, v_joao_uid),
    (v_acc_nubank, v_cat_farmacia,     67.80,  v_m1 + 14, 'DROGASIL',          'ofx', md5('ofx_nu_004'), 'FITID20250101004', v_batch_nubank, v_joao_uid),
    (v_acc_nubank, v_cat_restaurante,  89.90,  v_m1 + 16, 'REST MADALOSSO',    'ofx', md5('ofx_nu_005'), 'FITID20250101005', v_batch_nubank, v_joao_uid);

  -- =========================================================================
  -- RULES (auto-categorização)
  -- =========================================================================

  INSERT INTO rules (family_id, name, match, action, created_by) VALUES
    (v_silva_fam, 'Auto-categorizar iFood',
     '{"field":"description","operator":"contains","value":"ifood"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_delivery::text),
     v_joao_uid),
    (v_silva_fam, 'Auto-categorizar Uber',
     '{"field":"description","operator":"contains","value":"uber"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_uber::text),
     v_joao_uid);

  RAISE NOTICE '✓ Demo data inserted successfully!';
END $$;

-- Restaurar replication role
SET session_replication_role = 'origin';
