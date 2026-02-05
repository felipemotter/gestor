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

  -- Import batch UUIDs
  v_batch_nubank    uuid := 'b0000000-0000-0000-0000-000000000001';
  v_batch_nubank_2  uuid := 'b0000000-0000-0000-0000-000000000002';
  v_batch_viacredi  uuid := 'b0000000-0000-0000-0000-000000000003';
  v_batch_fl_nubank uuid := 'b0000000-0000-0000-0000-000000000004';
  v_batch_fl_sicoob uuid := 'b0000000-0000-0000-0000-000000000005';

  -- Transaction UUIDs (para vincular tags)
  v_tx uuid;

  -- Transaction UUIDs (para transfer_linked_id demo)
  v_tx_ted_vc_out uuid := 'a1000000-0000-0000-0000-000000000001';
  v_tx_ted_nu_in  uuid := 'a1000000-0000-0000-0000-000000000002';

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

  INSERT INTO families (id, name, reconciliation_settings, created_by) VALUES (
    v_family_id, 'Família Tirloni Pereira',
    '{"amount_tolerance_abs": 1.0, "date_tolerance_days": 2, "description_matching": false}'::jsonb,
    v_felipe_uid
  );
  INSERT INTO memberships (family_id, user_id, role, created_by)
    VALUES (v_family_id, v_felipe_uid, 'owner', v_felipe_uid);
  INSERT INTO memberships (family_id, user_id, role, created_by)
    VALUES (v_family_id, v_flavi_uid, 'member', v_felipe_uid);

  -- =========================================================================
  -- ACCOUNTS — Felipe
  -- =========================================================================

  -- reconciled_balance sera atualizado no final via account_balance_at()
  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, is_reconcilable, ofx_bank_id, ofx_account_id, reconciled_until, reconciled_balance, created_by)
    VALUES (v_acc_fe_nubank_cc, v_family_id, 'Nubank Felipe', 'checking', 2500.00, 'logo:nu-pagamentos-s-a', true, '0260', '123456-7', null, 0, v_felipe_uid);

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, created_by)
    VALUES (v_acc_fe_nubank_ct, v_family_id, 'Cartão Nubank Felipe', 'credit_card', 0.00, 'logo:nu-pagamentos-s-a', v_felipe_uid);

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, visibility, owner_user_id, icon_key, created_by)
    VALUES (v_acc_fe_carteira, v_family_id, 'Carteira Felipe', 'wallet', 200.00, 'private', v_felipe_uid, null, v_felipe_uid);

  -- reconciled_balance sera atualizado no final via account_balance_at()
  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, is_reconcilable, ofx_bank_id, ofx_account_id, reconciled_until, reconciled_balance, created_by)
    VALUES (v_acc_fe_viacredi, v_family_id, 'Viacredi Felipe', 'checking', 4200.00, 'logo:ailos', true, '0756', '98765-0', null, 0, v_felipe_uid);

  -- =========================================================================
  -- ACCOUNTS — Flavi
  -- =========================================================================

  -- reconciled_balance sera atualizado no final via account_balance_at()
  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, is_reconcilable, ofx_bank_id, ofx_account_id, reconciled_until, reconciled_balance, created_by)
    VALUES (v_acc_fl_nubank_cc, v_family_id, 'Nubank Flavi', 'checking', 1800.00, 'logo:nu-pagamentos-s-a', true, '0260', '654321-0', null, 0, v_flavi_uid);

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, created_by)
    VALUES (v_acc_fl_nubank_ct, v_family_id, 'Cartão Nubank Flavi', 'credit_card', 0.00, 'logo:nu-pagamentos-s-a', v_flavi_uid);

  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, visibility, owner_user_id, icon_key, created_by)
    VALUES (v_acc_fl_carteira, v_family_id, 'Carteira Flavi', 'wallet', 150.00, 'private', v_flavi_uid, null, v_flavi_uid);

  -- reconciled_balance sera atualizado no final via account_balance_at()
  INSERT INTO accounts (id, family_id, name, account_type, opening_balance, icon_key, is_reconcilable, ofx_bank_id, ofx_account_id, reconciled_until, reconciled_balance, created_by)
    VALUES (v_acc_fl_sicoob, v_family_id, 'Sicoob Flavi', 'checking', 3500.00, 'logo:sicoob', true, '0756', '11223-4', null, 0, v_flavi_uid);

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
  -- IMPORT BATCHES
  -- =========================================================================

  INSERT INTO import_batches (id, family_id, source, raw_hash, status, metadata, created_by, processed_at) VALUES
    (v_batch_nubank, v_family_id, 'ofx', 'demo_nubank_felipe_ofx_hash_001', 'processed',
     '{"bank":"Nubank","account":"CC Felipe","period":"2_meses_atras"}'::jsonb,
     v_felipe_uid, now()),
    (v_batch_nubank_2, v_family_id, 'ofx', 'demo_nubank_felipe_ofx_hash_002', 'processed',
     '{"bank":"Nubank","account":"CC Felipe","period":"mes_passado"}'::jsonb,
     v_felipe_uid, now()),
    (v_batch_viacredi, v_family_id, 'ofx', 'demo_viacredi_felipe_ofx_hash_001', 'processed',
     '{"bank":"Viacredi","account":"CC Felipe","period":"mes_passado"}'::jsonb,
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
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_aluguel, -2200.00, v_m2 + 10, 'Aluguel apartamento', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Condomínio - Viacredi Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_condominio, -650.00, v_m2 + 10, 'Condomínio', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Energia - Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_cc, v_cat_energia, -185.00, v_m2 + 15, 'CPFL Energia', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Água - Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_agua, -95.00, v_m2 + 15, 'SABESP', 'manual', v_felipe_uid);

  -- Internet - Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_cc, v_cat_internet, -129.90, v_m2 + 12, 'Vivo Fibra', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Supermercado - Cartão Nubank Flavi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_supermercado, -892.45, v_m2 + 8, 'Extra Supermercados', 'manual', v_flavi_uid);

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_supermercado, -345.80, v_m2 + 18, 'Pão de Açúcar', 'manual', v_flavi_uid);

  -- Restaurante - Cartão Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_ct, v_cat_restaurante, -156.00, v_m2 + 14, 'Outback Steakhouse', 'manual', v_felipe_uid);

  -- Delivery - Cartão Nubank Flavi
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fl_nubank_ct, v_cat_delivery, -67.90, v_m2 + 11, 'iFood - Sushi Leblon', 'manual', v_flavi_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  -- Combustível - Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_combustivel, -280.00, v_m2 + 7, 'Posto Shell BR-101', 'manual', v_felipe_uid);

  -- Uber - Cartão Nubank Flavi
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fl_nubank_ct, v_cat_uber, -34.50, v_m2 + 16, 'Uber - Centro → Casa', 'manual', v_flavi_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  -- Plano de Saúde - Viacredi Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_plano_saude, -890.00, v_m2 + 10, 'Unimed - Plano Familiar', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Farmácia - Cartão Nubank Flavi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_farmacia, -78.50, v_m2 + 20, 'Drogasil', 'manual', v_flavi_uid);

  -- Streaming - Cartão Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_ct, v_cat_streaming, -55.90, v_m2 + 1, 'Netflix + Spotify', 'manual', v_felipe_uid);
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
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_aluguel, -2200.00, v_m1 + 10, 'Aluguel apartamento', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Condomínio - Viacredi Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_condominio, -650.00, v_m1 + 10, 'Condomínio', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Energia - Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, reconciliation_hint, created_by)
    VALUES (v_tx, v_acc_fe_nubank_cc, v_cat_energia, -210.00, v_m1 + 15, 'CPFL Energia', 'manual', '{"match_description": "CPFL"}'::jsonb, v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Água - Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_agua, -88.00, v_m1 + 15, 'SABESP', 'manual', v_felipe_uid);

  -- Internet - Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_cc, v_cat_internet, -129.90, v_m1 + 12, 'Vivo Fibra', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Supermercado - Cartão Nubank Flavi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_supermercado, -1045.30, v_m1 + 7, 'Carrefour', 'manual', v_flavi_uid);

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_supermercado, -278.60, v_m1 + 20, 'Hortifruti', 'manual', v_flavi_uid);

  -- Restaurante - Cartão Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_ct, v_cat_restaurante, -198.00, v_m1 + 13, 'Fogo de Chão', 'manual', v_felipe_uid);

  -- Restaurante - Carteira Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_carteira, v_cat_restaurante, -42.00, v_m1 + 22, 'Pastel da feira', 'manual', v_felipe_uid);

  -- Delivery - Cartão Nubank Flavi
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fl_nubank_ct, v_cat_delivery, -89.90, v_m1 + 9, 'iFood - Pizza Hut', 'manual', v_flavi_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fl_nubank_ct, v_cat_delivery, -52.40, v_m1 + 17, 'iFood - Burger King', 'manual', v_flavi_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  -- Combustível - Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, reconciliation_hint, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_combustivel, -310.00, v_m1 + 6, 'Posto Ipiranga', 'manual', '{"match_description": "POSTO", "match_amount_min": 300, "match_amount_max": 320}'::jsonb, v_felipe_uid);

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_combustivel, -260.00, v_m1 + 21, 'Posto Shell', 'manual', v_felipe_uid);

  -- Uber - Cartão Nubank Flavi
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fl_nubank_ct, v_cat_uber, -28.70, v_m1 + 11, 'Uber - Shopping → Casa', 'manual', v_flavi_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  -- Plano de Saúde - Viacredi Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_plano_saude, -890.00, v_m1 + 10, 'Unimed - Plano Familiar', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Farmácia - Cartão Nubank Flavi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_farmacia, -125.80, v_m1 + 19, 'Droga Raia', 'manual', v_flavi_uid);

  -- Streaming - Cartão Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_ct, v_cat_streaming, -55.90, v_m1 + 1, 'Netflix + Spotify', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Cinema - Cartão Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_ct, v_cat_cinema, -96.00, v_m1 + 16, 'Cinemark - 2 ingressos + pipoca', 'manual', v_felipe_uid);

  -- Estacionamento - Carteira Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_carteira, v_cat_estacionamento, -25.00, v_m1 + 16, 'Estacionamento shopping', 'manual', v_felipe_uid);

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
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_aluguel, -2200.00, v_m0 + 10, 'Aluguel apartamento', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Condomínio - Viacredi Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_condominio, -650.00, v_m0 + 10, 'Condomínio', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Energia - Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_cc, v_cat_energia, -195.00, v_m0 + 15, 'CPFL Energia', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Internet - Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_cc, v_cat_internet, -129.90, v_m0 + 12, 'Vivo Fibra', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Supermercado - Cartão Nubank Flavi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_supermercado, -756.20, v_m0 + 4, 'Atacadão', 'manual', v_flavi_uid);

  -- Restaurante - Cartão Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_ct, v_cat_restaurante, -142.00, v_m0 + 8, 'Madero', 'manual', v_felipe_uid);

  -- Delivery - Cartão Nubank Flavi
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fl_nubank_ct, v_cat_delivery, -73.50, v_m0 + 6, 'iFood - McDonald''s', 'manual', v_flavi_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_variavel);

  -- Combustível - Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_cc, v_cat_combustivel, -295.00, v_m0 + 3, 'Posto BR', 'manual', v_felipe_uid);

  -- Plano de Saúde - Viacredi Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_viacredi, v_cat_plano_saude, -890.00, v_m0 + 10, 'Unimed - Plano Familiar', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Streaming - Cartão Nubank Felipe
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fe_nubank_ct, v_cat_streaming, -55.90, v_m0 + 1, 'Netflix + Spotify', 'manual', v_felipe_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_fixo);

  -- Vestuário - Cartão Nubank Flavi
  v_tx := gen_random_uuid();
  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_tx, v_acc_fl_nubank_ct, v_cat_vestuario, -389.90, v_m0 + 9, 'Renner', 'manual', v_flavi_uid);
  INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (v_tx, v_tag_parcelado);

  -- Cursos - Cartão Nubank Felipe
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fe_nubank_ct, v_cat_cursos, -197.00, v_m0 + 2, 'Alura - Assinatura mensal', 'manual', v_felipe_uid);

  -- Uber - Cartão Nubank Flavi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_ct, v_cat_uber, -22.30, v_m0 + 7, 'Uber - Trabalho → Casa', 'manual', v_flavi_uid);

  -- Rendimentos - Sicoob Flavi
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_sicoob, v_cat_rendimentos, 105.20, v_m0 + 1, 'Rendimento aplicação', 'manual', v_flavi_uid);

  -- =========================================================================
  -- OFX-IMPORTED TRANSACTIONS (Nubank Felipe, 2 meses atrás)
  -- =========================================================================

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, original_description, source, source_hash, external_id, import_batch_id, created_by)
  VALUES
    (v_acc_fe_nubank_cc, v_cat_supermercado, -234.56, v_m2 + 8,  'PAG*JoseDaSilva',  'PAG*JoseDaSilva',  'ofx', md5('ofx_nu_001'), 'FITID20250101001', v_batch_nubank, v_felipe_uid),
    (v_acc_fe_nubank_cc, v_cat_delivery,     -45.90,  v_m2 + 10, 'IFOOD *IFOOD',      'IFOOD *IFOOD',      'ofx', md5('ofx_nu_002'), 'FITID20250101002', v_batch_nubank, v_felipe_uid),
    (v_acc_fe_nubank_cc, v_cat_uber,         -31.20,  v_m2 + 12, 'UBER *UBER *TRIP',  'UBER *UBER *TRIP',  'ofx', md5('ofx_nu_003'), 'FITID20250101003', v_batch_nubank, v_felipe_uid),
    (v_acc_fe_nubank_cc, v_cat_farmacia,     -67.80,  v_m2 + 14, 'DROGASIL',          'DROGASIL',          'ofx', md5('ofx_nu_004'), 'FITID20250101004', v_batch_nubank, v_felipe_uid),
    (v_acc_fe_nubank_cc, v_cat_restaurante,  -89.90,  v_m2 + 16, 'REST MADALOSSO',    'REST MADALOSSO',    'ofx', md5('ofx_nu_005'), 'FITID20250101005', v_batch_nubank, v_felipe_uid),
    -- Near-matches para testar "Encontrar OFX" na reconciliação
    -- Combustível manual=280.00 em v_m2+7 → OFX -279.50 em v_m2+8 (valor -0.50, data +1)
    (v_acc_fe_nubank_cc, v_cat_combustivel,  -279.50,  v_m2 + 8,  'POSTO SHELL BR101', 'POSTO SHELL BR101', 'ofx', md5('ofx_nu_006'), 'FITID20250101006', v_batch_nubank, v_felipe_uid),
    -- Internet manual=129.90 em v_m2+12 → OFX -129.90 em v_m2+13 (mesmo valor, data +1)
    (v_acc_fe_nubank_cc, v_cat_internet,     -129.90,  v_m2 + 13, 'VIVO FIBRA INTERNET', 'VIVO FIBRA INTERNET', 'ofx', md5('ofx_nu_007'), 'FITID20250101007', v_batch_nubank, v_felipe_uid),
    -- Energia manual=185.00 em v_m2+15 → OFX -185.50 em v_m2+16 (valor +0.50, data +1)
    (v_acc_fe_nubank_cc, v_cat_energia,      -185.50,  v_m2 + 16, 'CPFL ENERGIA ELETRICA', 'CPFL ENERGIA ELETRICA', 'ofx', md5('ofx_nu_008'), 'FITID20250101008', v_batch_nubank, v_felipe_uid);

  -- =========================================================================
  -- OFX-IMPORTED TRANSACTIONS (Nubank Felipe, mês passado)
  -- Espelham o arquivo nubank_felipe.ofx
  -- =========================================================================

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, original_description, source, source_hash, external_id, import_batch_id, auto_categorized, created_by)
  VALUES
    -- Pareia com manual "Posto Ipiranga" 310.00
    (v_acc_fe_nubank_cc, v_cat_combustivel,  -310.00,  v_m1 + 6,  'POSTO IPIRANGA COMBUSTIVEL',  'POSTO IPIRANGA COMBUSTIVEL',  'ofx', md5('ofx_nu2_001'), 'NU20250106001', v_batch_nubank_2, true, v_felipe_uid),
    -- Pareia com manual "Vivo Fibra" 129.90
    (v_acc_fe_nubank_cc, v_cat_internet,     -129.90,  v_m1 + 12, 'VIVO FIBRA INTERNET',         'VIVO FIBRA INTERNET',         'ofx', md5('ofx_nu2_002'), 'NU20250112001', v_batch_nubank_2, true, v_felipe_uid),
    -- Pareia com manual "Projeto freelance" 1500.00
    (v_acc_fe_nubank_cc, v_cat_freelance,    1500.00, v_m1 + 15, 'TED RECEBIDO - PROJETO FREELANCE', 'TED RECEBIDO - PROJETO FREELANCE', 'ofx', md5('ofx_nu2_003'), 'NU20250115001', v_batch_nubank_2, false, v_felipe_uid),
    -- Pareia com manual "CPFL Energia" 210.00
    (v_acc_fe_nubank_cc, v_cat_energia,      -210.00,  v_m1 + 15, 'CPFL ENERGIA ELETRICA',        'CPFL ENERGIA ELETRICA',        'ofx', md5('ofx_nu2_004'), 'NU20250115002', v_batch_nubank_2, true, v_felipe_uid),
    -- Pareia com manual "SABESP" 88.00
    (v_acc_fe_nubank_cc, v_cat_agua,         -88.00,   v_m1 + 15, 'SABESP SANEAMENTO',            'SABESP SANEAMENTO',            'ofx', md5('ofx_nu2_005'), 'NU20250115003', v_batch_nubank_2, true, v_felipe_uid),
    -- SEM CATEGORIA — PIX recebido (crédito = positivo)
    (v_acc_fe_nubank_cc, null,               500.00,  v_m1 + 18, 'PIX RECEBIDO JOAO SILVA',      'PIX RECEBIDO JOAO SILVA',      'ofx', md5('ofx_nu2_006'), 'NU20250118001', v_batch_nubank_2, false, v_felipe_uid),
    -- SEM CATEGORIA — Boleto seguro (débito = negativo)
    (v_acc_fe_nubank_cc, null,               -145.00,  v_m1 + 20, 'PAGTO BOLETO SEGURO RESIDENCIAL', 'PAGTO BOLETO SEGURO RESIDENCIAL', 'ofx', md5('ofx_nu2_007'), 'NU20250120001', v_batch_nubank_2, false, v_felipe_uid),
    -- Pareia com manual "Posto Shell" 260.00
    (v_acc_fe_nubank_cc, v_cat_combustivel,  -260.00,  v_m1 + 21, 'POSTO SHELL COMBUSTIVEL',      'POSTO SHELL COMBUSTIVEL',      'ofx', md5('ofx_nu2_008'), 'NU20250121001', v_batch_nubank_2, true, v_felipe_uid);

  -- =========================================================================
  -- OFX-IMPORTED TRANSACTIONS (Viacredi Felipe, mês passado)
  -- Espelham o arquivo viacredi_felipe.ofx
  -- =========================================================================

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, original_description, source, source_hash, external_id, import_batch_id, auto_categorized, created_by)
  VALUES
    -- Pareia com manual "Salário Felipe" 8500.00
    (v_acc_fe_viacredi, v_cat_salario,       8500.00, v_m1 + 5,  'SALARIO EMPRESA LTDA',         'SALARIO EMPRESA LTDA',         'ofx', md5('ofx_vc_001'), 'VC20250105001', v_batch_viacredi, true, v_felipe_uid),
    -- Pareia com manual "Aluguel apartamento" 2200.00
    (v_acc_fe_viacredi, v_cat_aluguel,       -2200.00, v_m1 + 10, 'ALUGUEL IMOVEL RESIDENCIAL',   'ALUGUEL IMOVEL RESIDENCIAL',   'ofx', md5('ofx_vc_002'), 'VC20250110001', v_batch_viacredi, true, v_felipe_uid),
    -- Pareia com manual "Condomínio" 650.00
    (v_acc_fe_viacredi, v_cat_condominio,    -650.00,  v_m1 + 10, 'CONDOMINIO RESIDENCIAL',       'CONDOMINIO RESIDENCIAL',       'ofx', md5('ofx_vc_003'), 'VC20250110002', v_batch_viacredi, true, v_felipe_uid),
    -- Pareia com manual "Unimed - Plano Familiar" 890.00
    (v_acc_fe_viacredi, v_cat_plano_saude,   -890.00,  v_m1 + 10, 'UNIMED PLANO SAUDE',           'UNIMED PLANO SAUDE',           'ofx', md5('ofx_vc_004'), 'VC20250110003', v_batch_viacredi, true, v_felipe_uid),
    -- SEM CATEGORIA — Taxa serviço (débito = negativo)
    (v_acc_fe_viacredi, null,                -12.50,   v_m1 + 25, 'TAXA SERVICO BANCARIO',        'TAXA SERVICO BANCARIO',        'ofx', md5('ofx_vc_005'), 'VC20250125001', v_batch_viacredi, false, v_felipe_uid),
    -- SEM CATEGORIA — IOF (débito = negativo)
    (v_acc_fe_viacredi, null,                -3.45,    v_m1 + 28, 'IOF OPERACAO CREDITO',          'IOF OPERACAO CREDITO',          'ofx', md5('ofx_vc_006'), 'VC20250128001', v_batch_viacredi, false, v_felipe_uid);

  -- =========================================================================
  -- IMPORT BATCHES — Flavi
  -- =========================================================================

  INSERT INTO import_batches (id, family_id, source, raw_hash, status, metadata, created_by, processed_at) VALUES
    (v_batch_fl_nubank, v_family_id, 'ofx', 'demo_nubank_flavi_ofx_hash_001', 'processed',
     '{"bank":"Nubank","account":"CC Flavi","period":"mes_passado"}'::jsonb,
     v_flavi_uid, now()),
    (v_batch_fl_sicoob, v_family_id, 'ofx', 'demo_sicoob_flavi_ofx_hash_001', 'processed',
     '{"bank":"Sicoob","account":"CC Flavi","period":"mes_passado"}'::jsonb,
     v_flavi_uid, now());

  -- =========================================================================
  -- OFX-IMPORTED TRANSACTIONS (Nubank Flavi, mês passado)
  -- =========================================================================

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, original_description, source, source_hash, external_id, import_batch_id, auto_categorized, created_by)
  VALUES
    -- Pareia com manual "Transferência do Sicoob" 500.00 (crédito = positivo)
    (v_acc_fl_nubank_cc, v_cat_transferencia, 500.00, v_m1 + 7, 'TED RECEBIDO SICOOB', 'TED RECEBIDO SICOOB', 'ofx', md5('ofx_fln_001'), 'FNU20250107001', v_batch_fl_nubank, false, v_flavi_uid),
    -- SEM par manual — PIX avulso que Flavi não registrou (crédito = positivo)
    (v_acc_fl_nubank_cc, null,               85.00,  v_m1 + 14, 'PIX RECEBIDO MAE FLAVI',  'PIX RECEBIDO MAE FLAVI',  'ofx', md5('ofx_fln_002'), 'FNU20250114001', v_batch_fl_nubank, false, v_flavi_uid),
    -- SEM CATEGORIA — Debito automático (débito = negativo)
    (v_acc_fl_nubank_cc, null,               -42.90,  v_m1 + 18, 'DEB AUT CLARO CELULAR',   'DEB AUT CLARO CELULAR',   'ofx', md5('ofx_fln_003'), 'FNU20250118001', v_batch_fl_nubank, false, v_flavi_uid);

  -- =========================================================================
  -- OFX-IMPORTED TRANSACTIONS (Sicoob Flavi, mês passado)
  -- =========================================================================

  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, original_description, source, source_hash, external_id, import_batch_id, auto_categorized, created_by)
  VALUES
    -- Pareia com manual "Salário Flavi" 4200.00 (crédito = positivo)
    (v_acc_fl_sicoob, v_cat_salario,        4200.00, v_m1 + 5,  'SALARIO EMPRESA FLAVI',    'SALARIO EMPRESA FLAVI',    'ofx', md5('ofx_fls_001'), 'FSC20250105001', v_batch_fl_sicoob, true, v_flavi_uid),
    -- Pareia com manual "Transferência para Nubank" -500.00 (débito = negativo)
    (v_acc_fl_sicoob, v_cat_transferencia,  -500.00, v_m1 + 7,  'TED ENVIADA NUBANK',       'TED ENVIADA NUBANK',       'ofx', md5('ofx_fls_002'), 'FSC20250107001', v_batch_fl_sicoob, false, v_flavi_uid),
    -- SEM par manual — rendimento que Flavi não registrou (crédito = positivo)
    (v_acc_fl_sicoob, v_cat_rendimentos,    78.35,   v_m1 + 28, 'RENDIMENTO POUPANCA',      'RENDIMENTO POUPANCA',      'ofx', md5('ofx_fls_003'), 'FSC20250128001', v_batch_fl_sicoob, true, v_flavi_uid);

  -- =========================================================================
  -- CROSS-ACCOUNT TEST: manuais na conta errada + near-matches
  -- =========================================================================

  -- Cenário 1: Flavi registrou "Farmácia" no Nubank (R$125.80, dia m1+19)
  --            mas pagou de fato pelo Sicoob → OFX aparece no Sicoob (R$125.80, dia m1+19)
  --            Cross-account match exato (mesmo valor, mesma data, conta diferente)
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_cc, v_cat_farmacia, -125.80, v_m1 + 19, 'Droga Raia', 'manual', v_flavi_uid);
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, original_description, source, source_hash, external_id, import_batch_id, auto_categorized, created_by)
    VALUES (v_acc_fl_sicoob, v_cat_farmacia, -125.80, v_m1 + 19, 'DROGA RAIA FARMACIAS', 'DROGA RAIA FARMACIAS', 'ofx', md5('ofx_fls_004'), 'FSC20250119001', v_batch_fl_sicoob, true, v_flavi_uid);

  -- Cenário 2: Flavi registrou "Mercado" no Sicoob (R$350.00, dia m1+12)
  --            valor arredondado — OFX no Sicoob mostra R$347.85 no dia m1+12
  --            Near-match: valor -R$2.15, mesma data
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_sicoob, v_cat_supermercado, -350.00, v_m1 + 12, 'Supermercado Condor', 'manual', v_flavi_uid);
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, original_description, source, source_hash, external_id, import_batch_id, auto_categorized, created_by)
    VALUES (v_acc_fl_sicoob, v_cat_supermercado, -347.85, v_m1 + 12, 'CONDOR SUPER CENTER', 'CONDOR SUPER CENTER', 'ofx', md5('ofx_fls_005'), 'FSC20250112001', v_batch_fl_sicoob, true, v_flavi_uid);

  -- Cenário 3: Flavi registrou "PIX" no Sicoob (R$200.00, dia m1+10)
  --            mas o PIX caiu no Nubank → OFX no Nubank (R$200.00, dia m1+11, +1 dia)
  --            Cross-account + data diferente
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_sicoob, v_cat_rendimentos, 200.00, v_m1 + 10, 'PIX recebido prima', 'manual', v_flavi_uid);
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, original_description, source, source_hash, external_id, import_batch_id, auto_categorized, created_by)
    VALUES (v_acc_fl_nubank_cc, null, 200.00, v_m1 + 11, 'PIX RECEBIDO PRIMA FLAVI', 'PIX RECEBIDO PRIMA FLAVI', 'ofx', md5('ofx_fln_004'), 'FNU20250111001', v_batch_fl_nubank, false, v_flavi_uid);  -- crédito = positivo

  -- Cenário 4: Flavi registrou "Uber" no Nubank (R$35.00, dia m1+15)
  --            OFX no Nubank mostra R$37.50 no dia m1+16 (valor +R$2.50, data +1)
  --            Near-match: valor e data diferentes na mesma conta
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, source, created_by)
    VALUES (v_acc_fl_nubank_cc, v_cat_uber, -35.00, v_m1 + 15, 'Uber - Mercado → Casa', 'manual', v_flavi_uid);
  INSERT INTO transactions (account_id, category_id, amount, posted_at, description, original_description, source, source_hash, external_id, import_batch_id, auto_categorized, created_by)
    VALUES (v_acc_fl_nubank_cc, v_cat_uber, -37.50, v_m1 + 16, 'UBER *UBER *TRIP', 'UBER *UBER *TRIP', 'ofx', md5('ofx_fln_005'), 'FNU20250116001', v_batch_fl_nubank, true, v_flavi_uid);

  -- =========================================================================
  -- OFX TRANSFER LINKING DEMO
  -- TED Viacredi → Nubank Felipe (R$ 1.500,00, dia m1+6)
  -- Ambos lados OFX, vinculados via transfer_linked_id
  -- =========================================================================

  INSERT INTO transactions (id, account_id, category_id, amount, posted_at, description, original_description, source, source_hash, external_id, import_batch_id, auto_categorized, transfer_linked_id, created_by)
  VALUES
    (v_tx_ted_vc_out, v_acc_fe_viacredi, v_cat_transferencia, -1500.00, v_m1 + 6, 'TED ENVIADA NUBANK', 'TED ENVIADA NUBANK', 'ofx', md5('ofx_vc_ted_001'), 'VC20250106TED', v_batch_viacredi, false, v_tx_ted_nu_in, v_felipe_uid),
    (v_tx_ted_nu_in,  v_acc_fe_nubank_cc, v_cat_transferencia, 1500.00,  v_m1 + 6, 'TED RECEBIDO VIACREDI', 'TED RECEBIDO VIACREDI', 'ofx', md5('ofx_nu_ted_001'), 'NU20250106TED', v_batch_nubank_2, false, v_tx_ted_vc_out, v_felipe_uid);

  -- =========================================================================
  -- RULES (auto-categorização)
  -- =========================================================================

  INSERT INTO rules (family_id, name, match, action, priority, created_by) VALUES
    (v_family_id, 'Auto-categorizar iFood',
     '{"description_contains":"ifood"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_delivery::text),
     10, v_felipe_uid),
    (v_family_id, 'Auto-categorizar Uber',
     '{"description_contains":"uber"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_uber::text),
     10, v_felipe_uid),
    (v_family_id, 'CPFL / Energia',
     '{"description_regex":"cpfl|energia"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_energia::text),
     20, v_felipe_uid),
    (v_family_id, 'SABESP / Água',
     '{"description_regex":"sabesp|agua"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_agua::text),
     20, v_felipe_uid),
    (v_family_id, 'Vivo / Internet',
     '{"description_regex":"vivo|fibra"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_internet::text),
     20, v_felipe_uid),
    (v_family_id, 'Posto / Combustível',
     '{"description_regex":"posto|combustivel"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_combustivel::text),
     20, v_felipe_uid),
    (v_family_id, 'Unimed / Plano de Saúde',
     '{"description_contains":"unimed"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_plano_saude::text),
     20, v_felipe_uid),
    (v_family_id, 'Netflix / Spotify / Streaming',
     '{"description_regex":"netflix|spotify"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_streaming::text),
     20, v_felipe_uid),
    (v_family_id, 'Drogasil / Droga Raia / Farmácia',
     '{"description_regex":"drogasil|droga raia|farmacia"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_farmacia::text),
     20, v_felipe_uid),
    (v_family_id, 'Aluguel',
     '{"description_contains":"aluguel"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_aluguel::text),
     30, v_felipe_uid),
    (v_family_id, 'Condomínio',
     '{"description_contains":"condominio"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_condominio::text),
     30, v_felipe_uid),
    (v_family_id, 'Supermercado / Atacadão / Carrefour',
     '{"description_regex":"supermercado|atacadao|carrefour"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_supermercado::text),
     30, v_felipe_uid),
    (v_family_id, 'Salário',
     '{"description_contains":"salario"}'::jsonb,
     jsonb_build_object('set_category_id', v_cat_salario::text),
     30, v_felipe_uid);

  -- =========================================================================
  -- ATUALIZAR reconciled_balance = saldo do BANCO (sem manuais duplicados)
  -- O banco vê: opening_balance + OFX + transfers + adjustments (não manuais)
  -- Isso é o saldo-alvo: após reconciliar (deletar manuais), o sistema converge
  -- =========================================================================

  -- reconciled_until = data do ultimo OFX importado por conta
  UPDATE accounts a SET reconciled_until = (
    SELECT max(t.posted_at)
    FROM transactions t
    WHERE t.account_id = a.id AND t.source = 'ofx'
  ) WHERE a.is_reconcilable;

  -- reconciled_balance = saldo esperado apos reconciliar (deletar manuais e transfers duplicados)
  -- Inclui: tudo exceto manuais/transfers que caem no periodo com cobertura OFX
  -- Manuais anteriores ao primeiro OFX nao sao duplicatas, entram no saldo
  UPDATE accounts a SET reconciled_balance = (
    SELECT coalesce(a.opening_balance, 0) + coalesce((
      SELECT sum(t.amount)
      FROM transactions t
      WHERE t.account_id = a.id
        AND t.posted_at <= a.reconciled_until
        AND NOT (
          t.source in ('manual', 'transfer')
          AND t.posted_at >= coalesce((
            SELECT min(ox.posted_at) FROM transactions ox
            WHERE ox.account_id = a.id AND ox.source = 'ofx'
          ), a.reconciled_until)
        )
    ), 0)
  ) WHERE a.is_reconcilable AND a.reconciled_until IS NOT NULL;

  RAISE NOTICE '✓ Demo data inserted successfully!';
END $$;

-- Restaurar replication role
SET session_replication_role = 'origin';
