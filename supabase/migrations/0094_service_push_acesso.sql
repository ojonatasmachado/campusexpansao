-- Inscrições de push são escritas pelas rotas autenticadas com service_role.
-- SELECT continua limitado à própria pessoa pela policy de 0044.
-- Sem esta revogação, svc_tenant permitia forjar inscrição de outra pessoa.
revoke insert, update, delete on service.push_subscriptions from anon, authenticated;
grant insert, update, delete on service.push_subscriptions to service_role;
