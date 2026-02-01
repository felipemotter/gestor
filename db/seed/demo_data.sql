-- =============================================================================
-- Demo Data for Gestor
-- Familia Tirloni Pereira: Felipe (owner) e Flavi (member)
-- Usa datas relativas a CURRENT_DATE para dados sempre atualizados
-- =============================================================================

-- Desabilitar triggers de RLS para inserir dados diretamente
SET session_replication_role = 'replica';

DO $$
DECLARE
  -- User UUIDs (fixos para reprodutibilidade)
  v_felipe_uid  uuid := 'a0000000-0000-0000-0000-000000000002';
  v_flavi_uid   uuid := 'a0000000-0000-0000-0000-000000000003';

  -- Family UUID
  v_family_id   uuid := 'f0000000-0000-0000-0000-000000000001';

  -- Account UUIDs — Felipe
  v_acc_fe_nubank_cc  uuid := 'c0000000-0000-0000-0000-000000000001';
  v_acc_fe_nubank_ct  uuid := 'c0000000-0000-0000-0000-000000000002';
  v_acc_fe_carteira   uuid := 'c0000000-0000-0000-0000-000000000003';
  v_acc_fe_viacredi   uuid := 'c0000000-0000-0000-0000-000000000004';

  -- Account UUIDs — Flavi
  v_acc_fl_nubank_cc  uuid := 'c0000000-0000-0000-0000-000000000005';
  v_acc_fl_nubank_ct  uuid := 'c0000000-0000-0000-0000-000000000006';
  v_acc_fl_carteira   uuid := 'c0000000-0000-0000-0000-000000000007';
  v_acc_fl_sicoob     uuid := 'c0000000-0000-0000-0000-000000000008';

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

  -- Transaction UUIDs (para vincular tags)
  v_tx uuid;

  -- Date helpers
  v_today         date := CURRENT_DATE;
  v_m0            date;  -- inicio do mes atual
  v_m1            date;  -- inicio do mes passado
  v_m2            date;  -- inicio de 2 meses atras

  -- Password hash for 'demo123' (bcrypt)
  v_password_hash text := '$2a$10$Iq2RFRTryQTpGtXruxCrKeHryMqiw2SMzUcQ.4KjNIM9VqNirrf5y';

BEGIN
  -- Calcular datas relativas
  v_m0 := date_trunc('month', v_today)::date;
  v_m1 := (date_trunc('month', v_today) - interval '1 month')::date;
  v_m2 := (date_trunc('month', v_today) - interval '2 months')::date;

  -- =========================================================================
  -- USERS (auth.users + auth.identities)
  -- =========================================================================

  -- Felipe
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
    '00000000-0000-0000-0000-000000000000', v_felipe_uid, 'authenticated', 'authenticated',
    'felipe@demo.com', v_password_hash,
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Felipe Tirloni Pereira"}'::jsonb,
    now(), now(),
    '', '', '',
    '', '', '',
    '', '',
    false, false
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_felipe_uid, v_felipe_uid, 'felipe@demo.com',
    jsonb_build_object('sub', v_felipe_uid::text, 'email', 'felipe@demo.com'),
    'email', now(), now(), now()
  );

  -- Flavi
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
    '00000000-0000-0000-0000-000000000000', v_flavi_uid, 'authenticated', 'authenticated',
    'flavi@demo.com', v_password_hash,
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Flavi Tirloni Pereira"}'::jsonb,
    now(), now(),
    '', '', '',
    '', '', '',
    '', '',
    false, false
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_flavi_uid, v_flavi_uid, 'flavi@demo.com',
    jsonb_build_object('sub', v_flavi_uid::text, 'email', 'flavi@demo.com'),
    'email', now(), now(), now()
  );

  -- =========================================================================
  -- FAMILY + MEMBERSHIPS
  -- =========================================================================

  INSERT INTO families (id, name, created_by) VALUES (v_family_id, 'Família Tirloni Pereira', v_felipe_uid);
  INSERT INTO memberships (family_id, user_id, role, created_by)
    VALUES (v_family_id, v_felipe_uid, 'owner', v_felipe_uid);
  INSERT INTO memberships (family_id, user_id, role, created_by)
    VALUES (v_family_id, v_flavi_uid, 'member', v_felipe_uid);

  -- =========================================================================
  -- ACCOUNTS — Felipe
  -- =========================================================================

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, is_reconcilable, created_by)
    VALUES (v_acc_fe_nubank_cc, v_family_id, 'Nubank Felipe', 'checking', 2500.00, 'logo:nu-pagamentos-s-a', true, v_felipe_uid);

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, created_by)
    VALUES (v_acc_fe_nubank_ct, v_family_id, 'Cartão Nubank Felipe', 'credit_card', 0.00, 'logo:nu-pagamentos-s-a', v_felipe_uid);

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, visibility, owner_user_id, icon_key, created_by)
    VALUES (v_acc_fe_carteira, v_family_id, 'Carteira Felipe', 'wallet', 200.00, 'private', v_felipe_uid, null, v_felipe_uid);

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, is_reconcilable, created_by)
    VALUES (v_acc_fe_viacredi, v_family_id, 'Viacredi Felipe', 'checking', 4200.00, 'logo:ailos', true, v_felipe_uid);

  -- =========================================================================
  -- ACCOUNTS — Flavi
  -- =========================================================================

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, is_reconcilable, created_by)
    VALUES (v_acc_fl_nubank_cc, v_family_id, 'Nubank Flavi', 'checking', 1800.00, 'logo:nu-pagamentos-s-a', true, v_flavi_uid);

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, created_by)
    VALUES (v_acc_fl_nubank_ct, v_family_id, 'Cartão Nubank Flavi', 'credit_card', 0.00, 'logo:nu-pagamentos-s-a', v_flavi_uid);

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, visibility, owner_user_id, icon_key, created_by)
    VALUES (v_acc_fl_carteira, v_family_id, 'Carteira Flavi', 'wallet', 150.00, 'private', v_flavi_uid, null, v_flavi_uid);

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, is_reconcilable, created_by)
    VALUES (v_acc_fl_sicoob, v_family_id, 'Sicoob Flavi', 'checking', 3500.00, 'logo:sicoob', true, v_flavi_uid);

  -- =========================================================================
  -- CATEGORIES
  -- =========================================================================

  -- Expense parents
  INSERT INTO categories (id, family_id, name, category_type, created_by) VALUES
    (v_cat_moradia,     v_family_id, 'Moradia',      'expense', v_felipe_uid),
    (v_cat_alimentacao, v_family_id, 'Alimentação',   'expense', v_felipe_uid),
    (v_cat_transporte,  v_family_id, 'Transporte',    'expense', v_felipe_uid),
    (v_cat_saude,       v_family_id, 'Saúde',         'expense', v_felipe_uid),
    (v_cat_educacao,    v_family_id, 'Educação',      'expense', v_felipe_uid),
    (v_cat_lazer,       v_family_id, 'Lazer',         'expense', v_felipe_uid),
    (v_cat_vestuario,   v_family_id, 'Vestuário',     'expense', v_felipe_uid),
    (v_cat_outros,      v_family_id, 'Outros',        'expense', v_felipe_uid);

  -- Expense children
  INSERT INTO categories (id, family_id, parent_id, name, category_type, created_by) VALUES
    (v_cat_aluguel,        v_family_id, v_cat_moradia,     'Aluguel',         'expense', v_felipe_uid),
    (v_cat_condominio,     v_family_id, v_cat_moradia,     'Condomínio',      'expense', v_felipe_uid),
    (v_cat_energia,        v_family_id, v_cat_moradia,     'Energia',         'expense', v_felipe_uid),
    (v_cat_agua,           v_family_id, v_cat_moradia,     'Água',            'expense', v_felipe_uid),
    (v_cat_internet,       v_family_id, v_cat_moradia,     'Internet',        'expense', v_felipe_uid),
    (v_cat_supermercado,   v_family_id, v_cat_alimentacao, 'Supermercado',    'expense', v_felipe_uid),
    (v_cat_restaurante,    v_family_id, v_cat_alimentacao, 'Restaurante',     'expense', v_felipe_uid),
    (v_cat_delivery,       v_family_id, v_cat_alimentacao, 'Delivery',        'expense', v_felipe_uid),
    (v_cat_combustivel,    v_family_id, v_cat_transporte,  'Combustível',     'expense', v_felipe_uid),
    (v_cat_uber,           v_family_id, v_cat_transporte,  'Uber/99',         'expense', v_felipe_uid),
    (v_cat_estacionamento, v_family_id, v_cat_transporte,  'Estacionamento',  'expense', v_felipe_uid),
    (v_cat_farmacia,       v_family_id, v_cat_saude,       'Farmácia',        'expense', v_felipe_uid),
    (v_cat_plano_saude,    v_family_id, v_cat_saude,       'Plano de Saúde',  'expense', v_felipe_uid),
    (v_cat_escola,         v_family_id, v_cat_educacao,    'Escola',          'expense', v_felipe_uid),
    (v_cat_cursos,         v_family_id, v_cat_educacao,    'Cursos',          'expense', v_felipe_uid),
    (v_cat_streaming,      v_family_id, v_cat_lazer,       'Streaming',       'expense', v_felipe_uid),
    (v_cat_cinema,         v_family_id, v_cat_lazer,       'Cinema',          'expense', v_felipe_uid),
    (v_cat_viagem,         v_family_id, v_cat_lazer,       'Viagem',          'expense', v_felipe_uid);

  -- Income categories
  INSERT INTO categories (id, family_id, name, category_type, created_by) VALUES
    (v_cat_salario,     v_family_id, 'Salário',      'income', v_felipe_uid),
    (v_cat_freelance,   v_family_id, 'Freelance',    'income', v_felipe_uid),
    (v_cat_rendimentos, v_family_id, 'Rendimentos',  'income', v_felipe_uid);

  -- Transfer category
  INSERT INTO categories (id, family_id, name, category_type, created_by) VALUES
    (v_cat_transferencia, v_family_id, 'Transferência', 'transfer', v_felipe_uid);

  -- =========================================================================
  -- TAGS
  -- =========================================================================

  INSERT INTO tags (id, family_id, name, created_by) VALUES
    (v_tag_fixo,      v_family_id, 'Fixo',      v_felipe_uid),
    (v_tag_variavel,  v_family_id, 'Variável',  v_felipe_uid),
    (v_tag_parcelado, v_family_id, 'Parcelado', v_felipe_uid),
    (v_tag_urgente,   v_family_id, 'Urgente',   v_felipe_uid);

  -- =========================================================================
  -- IMPORT BATCH (simulando OFX Nubank Felipe)
  -- =========================================================================

  INSERT INTO import_batches (id, family_id, source, raw_hash, status, metadata, created_by, processed_at) VALUES
    (v_batch_nubank, v_family_id, 'ofx', 'demo_nubank_felipe_ofx_hash_001', 'processed',
     '{"bank":"Nubank","account":"CC Felipe","period":"ultimo_mes"}'::jsonb,
     v_felipe_uid, now());

  -- =========================================================================
  -- TRANSACTIONS — 2 meses atrás (v_m2)
  -- =========================================================================

  -- Salário Felipe - Viacredi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_viacredi, v_cat_salario, 8500.00, v_m2 + 5, 'Salário Felipe', 'manual', v_felipe_uid);

  -- Salário Flavi - Sicoob
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_sicoob, v_cat_salario, 4200.00, v_m2 + 5, 'Salário Flavi', 'manual', v_flavi_uid);

  -- Aluguel - Viacredi Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_aluguel, 2200.00, v_m2 + 10, 'Aluguel apartamento', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Condomínio - Viacredi Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_condominio, 650.00, v_m2 + 10, 'Condomínio', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Energia - Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_cc, v_cat_energia, 185.00, v_m2 + 15, 'CPFL Energia', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Água - Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_agua, 95.00, v_m2 + 15, 'SABESP', 'manual', v_felipe_uid);

  -- Internet - Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_cc, v_cat_internet, 129.90, v_m2 + 12, 'Vivo Fibra', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Supermercado - Cartão Nubank Flavi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_supermercado, 892.45, v_m2 + 8, 'Extra Supermercados', 'manual', v_flavi_uid);

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_supermercado, 345.80, v_m2 + 18, 'Pão de Açúcar', 'manual', v_flavi_uid);

  -- Restaurante - Cartão Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_ct, v_cat_restaurante, 156.00, v_m2 + 14, 'Outback Steakhouse', 'manual', v_felipe_uid);

  -- Delivery - Cartão Nubank Flavi
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fl_nubank_ct, v_cat_delivery, 67.90, v_m2 + 11, 'iFood - Sushi Leblon', 'manual', v_flavi_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  -- Combustível - Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_combustivel, 280.00, v_m2 + 7, 'Posto Shell BR-101', 'manual', v_felipe_uid);

  -- Uber - Cartão Nubank Flavi
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fl_nubank_ct, v_cat_uber, 34.50, v_m2 + 16, 'Uber - Centro → Casa', 'manual', v_flavi_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  -- Plano de Saúde - Viacredi Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_plano_saude, 890.00, v_m2 + 10, 'Unimed - Plano Familiar', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Farmácia - Cartão Nubank Flavi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_farmacia, 78.50, v_m2 + 20, 'Drogasil', 'manual', v_flavi_uid);

  -- Streaming - Cartão Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_ct, v_cat_streaming, 55.90, v_m2 + 1, 'Netflix + Spotify', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Transferência: Viacredi Felipe -> Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_viacredi, v_cat_transferencia, -1000.00, v_m2 + 6, 'Transferência para Nubank', 'transfer', v_felipe_uid);
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_transferencia, 1000.00, v_m2 + 6, 'Transferência da Viacredi', 'transfer', v_felipe_uid);

  -- =========================================================================
  -- TRANSACTIONS — Mês passado (v_m1)
  -- =========================================================================

  -- Salário Felipe - Viacredi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_viacredi, v_cat_salario, 8500.00, v_m1 + 5, 'Salário Felipe', 'manual', v_felipe_uid);

  -- Salário Flavi - Sicoob
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_sicoob, v_cat_salario, 4200.00, v_m1 + 5, 'Salário Flavi', 'manual', v_flavi_uid);

  -- Freelance - Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_freelance, 1500.00, v_m1 + 15, 'Projeto freelance - Site empresa', 'manual', v_felipe_uid);

  -- Aluguel - Viacredi Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_aluguel, 2200.00, v_m1 + 10, 'Aluguel apartamento', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Condomínio - Viacredi Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_condominio, 650.00, v_m1 + 10, 'Condomínio', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Energia - Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_cc, v_cat_energia, 210.00, v_m1 + 15, 'CPFL Energia', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Água - Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_agua, 88.00, v_m1 + 15, 'SABESP', 'manual', v_felipe_uid);

  -- Internet - Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_cc, v_cat_internet, 129.90, v_m1 + 12, 'Vivo Fibra', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Supermercado - Cartão Nubank Flavi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_supermercado, 1045.30, v_m1 + 7, 'Carrefour', 'manual', v_flavi_uid);

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_supermercado, 278.60, v_m1 + 20, 'Hortifruti', 'manual', v_flavi_uid);

  -- Restaurante - Cartão Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_ct, v_cat_restaurante, 198.00, v_m1 + 13, 'Fogo de Chão', 'manual', v_felipe_uid);

  -- Restaurante - Carteira Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_carteira, v_cat_restaurante, 42.00, v_m1 + 22, 'Pastel da feira', 'manual', v_felipe_uid);

  -- Delivery - Cartão Nubank Flavi
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fl_nubank_ct, v_cat_delivery, 89.90, v_m1 + 9, 'iFood - Pizza Hut', 'manual', v_flavi_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fl_nubank_ct, v_cat_delivery, 52.40, v_m1 + 17, 'iFood - Burger King', 'manual', v_flavi_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  -- Combustível - Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_combustivel, 310.00, v_m1 + 6, 'Posto Ipiranga', 'manual', v_felipe_uid);

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_combustivel, 260.00, v_m1 + 21, 'Posto Shell', 'manual', v_felipe_uid);

  -- Uber - Cartão Nubank Flavi
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fl_nubank_ct, v_cat_uber, 28.70, v_m1 + 11, 'Uber - Shopping → Casa', 'manual', v_flavi_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  -- Plano de Saúde - Viacredi Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_plano_saude, 890.00, v_m1 + 10, 'Unimed - Plano Familiar', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Farmácia - Cartão Nubank Flavi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_farmacia, 125.80, v_m1 + 19, 'Droga Raia', 'manual', v_flavi_uid);

  -- Streaming - Cartão Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_ct, v_cat_streaming, 55.90, v_m1 + 1, 'Netflix + Spotify', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Cinema - Cartão Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_ct, v_cat_cinema, 96.00, v_m1 + 16, 'Cinemark - 2 ingressos + pipoca', 'manual', v_felipe_uid);

  -- Estacionamento - Carteira Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_carteira, v_cat_estacionamento, 25.00, v_m1 + 16, 'Estacionamento shopping', 'manual', v_felipe_uid);

  -- Transferência: Viacredi Felipe -> Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_viacredi, v_cat_transferencia, -1500.00, v_m1 + 6, 'Transferência para Nubank', 'transfer', v_felipe_uid);
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_transferencia, 1500.00, v_m1 + 6, 'Transferência da Viacredi', 'transfer', v_felipe_uid);

  -- Transferência: Sicoob Flavi -> Nubank Flavi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_sicoob, v_cat_transferencia, -500.00, v_m1 + 7, 'Transferência para Nubank', 'transfer', v_flavi_uid);
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_cc, v_cat_transferencia, 500.00, v_m1 + 7, 'Transferência do Sicoob', 'transfer', v_flavi_uid);

  -- Transferência: Nubank Felipe -> Carteira Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_transferencia, -200.00, v_m1 + 3, 'Saque para carteira', 'transfer', v_felipe_uid);
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_carteira, v_cat_transferencia, 200.00, v_m1 + 3, 'Saque Nubank', 'transfer', v_felipe_uid);

  -- =========================================================================
  -- TRANSACTIONS — Mês atual (v_m0)
  -- =========================================================================

  -- Salário Felipe - Viacredi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_viacredi, v_cat_salario, 8500.00, v_m0 + 5, 'Salário Felipe', 'manual', v_felipe_uid);

  -- Salário Flavi - Sicoob
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_sicoob, v_cat_salario, 4200.00, v_m0 + 5, 'Salário Flavi', 'manual', v_flavi_uid);

  -- Aluguel - Viacredi Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_aluguel, 2200.00, v_m0 + 10, 'Aluguel apartamento', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Condomínio - Viacredi Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_condominio, 650.00, v_m0 + 10, 'Condomínio', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Energia - Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_cc, v_cat_energia, 195.00, v_m0 + 15, 'CPFL Energia', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Internet - Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_cc, v_cat_internet, 129.90, v_m0 + 12, 'Vivo Fibra', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Supermercado - Cartão Nubank Flavi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_supermercado, 756.20, v_m0 + 4, 'Atacadão', 'manual', v_flavi_uid);

  -- Restaurante - Cartão Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_ct, v_cat_restaurante, 142.00, v_m0 + 8, 'Madero', 'manual', v_felipe_uid);

  -- Delivery - Cartão Nubank Flavi
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fl_nubank_ct, v_cat_delivery, 73.50, v_m0 + 6, 'iFood - McDonald''s', 'manual', v_flavi_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  -- Combustível - Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_combustivel, 295.00, v_m0 + 3, 'Posto BR', 'manual', v_felipe_uid);

  -- Plano de Saúde - Viacredi Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_plano_saude, 890.00, v_m0 + 10, 'Unimed - Plano Familiar', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Streaming - Cartão Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_ct, v_cat_streaming, 55.90, v_m0 + 1, 'Netflix + Spotify', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Vestuário - Cartão Nubank Flavi
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fl_nubank_ct, v_cat_vestuario, 389.90, v_m0 + 9, 'Renner', 'manual', v_flavi_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_parcelado);

  -- Cursos - Cartão Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_ct, v_cat_cursos, 197.00, v_m0 + 2, 'Alura - Assinatura mensal', 'manual', v_felipe_uid);

  -- Uber - Cartão Nubank Flavi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_uber, 22.30, v_m0 + 7, 'Uber - Trabalho → Casa', 'manual', v_flavi_uid);

  -- Rendimentos - Sicoob Flavi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_sicoob, v_cat_rendimentos, 105.20, v_m0 + 1, 'Rendimento aplicação', 'manual', v_flavi_uid);

  -- =========================================================================
  -- OFX-IMPORTED TRANSACTIONS (Nubank Felipe, mês passado)
  -- =========================================================================

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, source_hash, external_id, import_batch_id, created_by)
  VALUES
    (v_acc_fe_nubank_cc, v_cat_supermercado, 234.56, v_m1 + 8,  'PAG*JoseDaSilva',  'ofx', md5('ofx_nu_001'), 'FITID20250101001', v_batch_nubank, v_felipe_uid),
    (v_acc_fe_nubank_cc, v_cat_delivery,     45.90,  v_m1 + 10, 'IFOOD *IFOOD',      'ofx', md5('ofx_nu_002'), 'FITID20250101002', v_batch_nubank, v_felipe_uid),
    (v_acc_fe_nubank_cc, v_cat_uber,         31.20,  v_m1 + 12, 'UBER *UBER *TRIP',  'ofx', md5('ofx_nu_003'), 'FITID20250101003', v_batch_nubank, v_felipe_uid),
    (v_acc_fe_nubank_cc, v_cat_farmacia,     67.80,  v_m1 + 14, 'DROGASIL',          'ofx', md5('ofx_nu_004'), 'FITID20250101004', v_batch_nubank, v_felipe_uid),
    (v_acc_fe_nubank_cc, v_cat_restaurante,  89.90,  v_m1 + 16, 'REST MADALOSSO',    'ofx', md5('ofx_nu_005'), 'FITID20250101005', v_batch_nubank, v_felipe_uid);

  -- =========================================================================
  -- RULES (auto-categorização)
  -- =========================================================================

  INSERT INTO rules (family_id, name, match, action, created_by) VALUES
    (v_family_id, 'Auto-categorizar iFood',
     '{"description_contains":"ifood"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_delivery::text),
     v_felipe_uid),
    (v_family_id, 'Auto-categorizar Uber',
     '{"description_contains":"uber"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_uber::text),
     v_felipe_uid);

  RAISE NOTICE '✓ Demo data inserted successfully!';
END $$;

-- Restaurar replication role
SET session_replication_role = 'origin';
