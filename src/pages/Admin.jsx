import { useEffect, useMemo, useState } from 'react'
import { adminListClients, adminListSignups, adminUpdateClientAccess } from '../services/api'

const PLAN_OPTIONS = {
  manual: { plan_id: null, plan_name: null, billing_interval_months: null, label: 'Manual' },
  mensal: { plan_id: 'mensal', plan_name: 'Mensal', billing_interval_months: 1, label: 'Mensal' },
  trimestral: { plan_id: 'trimestral', plan_name: 'Trimestral', billing_interval_months: 3, label: 'Trimestral' },
  semestral: { plan_id: 'semestral', plan_name: 'Semestral', billing_interval_months: 6, label: 'Semestral' },
  anual: { plan_id: 'anual', plan_name: 'Anual', billing_interval_months: 12, label: 'Anual' },
}

function dateInputValue(dateLike) {
  if (!dateLike) return ''
  const date = new Date(dateLike)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function formatDateTime(dateLike) {
  if (!dateLike) return 'Nunca'
  const date = new Date(dateLike)
  if (Number.isNaN(date.getTime())) return 'Nunca'
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatDate(dateLike) {
  if (!dateLike) return '—'
  const date = new Date(dateLike)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('pt-BR')
}

function getStatusLabel(client) {
  if (client.read_only) return 'Demo'
  if (!client.is_active) return 'Bloqueado'
  if (client.subscription_status === 'past_due') return 'Atrasado'
  if (client.subscription_status === 'active') return 'Ativo'
  if (client.subscription_status === 'pending') return 'Pendente'
  if (client.subscription_status === 'canceled') return 'Cancelado'
  if (client.subscription_status === 'expired') return 'Vencido'
  return 'Manual'
}

function getStatusClass(client) {
  if (client.read_only) return 'demo'
  if (!client.is_active || ['expired', 'canceled'].includes(client.subscription_status)) return 'blocked'
  if (client.subscription_status === 'past_due') return 'warning'
  if (client.subscription_status === 'active') return 'active'
  return 'manual'
}

export default function Admin() {
  const [clients, setClients] = useState([])
  const [signups, setSignups] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)

  async function loadClients() {
    setLoading(true)
    setMessage('')
    try {
      const [data, signupData] = await Promise.all([adminListClients(), adminListSignups()])
      setClients(data)
      setSignups(signupData)
    } catch (error) {
      setMessage(error.message || 'Não foi possível carregar o painel admin.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return clients
    return clients.filter((client) => [
      client.email,
      client.name,
      client.full_name,
      client.stall_name,
      client.city,
      client.plan_name,
      client.subscription_status,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)))
  }, [clients, search])

  const totals = useMemo(() => ({
    total: clients.length,
    active: clients.filter((c) => c.is_active && !c.read_only && ['active', 'manual'].includes(c.subscription_status)).length,
    overdue: clients.filter((c) => c.subscription_status === 'past_due').length,
    blocked: clients.filter((c) => !c.is_active || ['expired', 'canceled'].includes(c.subscription_status)).length,
    demo: clients.filter((c) => c.read_only).length,
  }), [clients])

  function openEdit(client) {
    setMessage('')
    const currentPlan = client.plan_id || 'manual'
    setEditing({
      user_id: client.user_id,
      name: client.full_name || client.name || client.email,
      email: client.email,
      is_active: Boolean(client.is_active),
      read_only: Boolean(client.read_only),
      subscription_status: client.subscription_status || 'manual',
      plan_key: PLAN_OPTIONS[currentPlan] ? currentPlan : 'manual',
      current_period_end: dateInputValue(client.current_period_end),
      label: client.label || '',
    })
  }

  async function saveEdit(event) {
    event.preventDefault()
    setMessage('')
    const plan = PLAN_OPTIONS[editing.plan_key] || PLAN_OPTIONS.manual
    const periodEnd = editing.current_period_end ? `${editing.current_period_end}T23:59:59-03:00` : null

    try {
      await adminUpdateClientAccess({
        user_id: editing.user_id,
        is_active: editing.is_active,
        read_only: editing.read_only,
        subscription_status: editing.read_only ? 'demo' : editing.subscription_status,
        plan_id: plan.plan_id,
        plan_name: editing.read_only ? 'Demonstração' : plan.plan_name,
        billing_interval_months: plan.billing_interval_months,
        current_period_end: periodEnd,
        label: editing.label,
      })
      setEditing(null)
      await loadClients()
      setMessage('Cliente atualizado com sucesso.')
    } catch (error) {
      setMessage(error.message || 'Não foi possível atualizar o cliente.')
    }
  }

  async function quickBlock(client) {
    try {
      await adminUpdateClientAccess({
        user_id: client.user_id,
        is_active: false,
        read_only: Boolean(client.read_only),
        subscription_status: client.read_only ? 'demo' : 'expired',
        plan_id: client.plan_id,
        plan_name: client.plan_name,
        billing_interval_months: client.billing_interval_months,
        current_period_end: client.current_period_end,
        label: client.label || 'Bloqueado pelo admin',
      })
      await loadClients()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function quickActivate(client) {
    const planKey = client.plan_id || 'manual'
    const plan = PLAN_OPTIONS[planKey] || PLAN_OPTIONS.manual
    const months = plan.billing_interval_months || 1
    const end = new Date()
    end.setMonth(end.getMonth() + months)

    try {
      await adminUpdateClientAccess({
        user_id: client.user_id,
        is_active: true,
        read_only: false,
        subscription_status: plan.plan_id ? 'active' : 'manual',
        plan_id: plan.plan_id,
        plan_name: plan.plan_name,
        billing_interval_months: plan.billing_interval_months,
        current_period_end: plan.plan_id ? end.toISOString() : null,
        label: client.label,
      })
      await loadClients()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="page admin-page">
      <div className="admin-title-row">
        <div>
          <h2>Painel Admin</h2>
          <p className="muted">Área privada para acompanhar clientes, acessos, planos e vencimentos.</p>
        </div>
        <button className="mini-filled" onClick={loadClients}>Atualizar</button>
      </div>

      <div className="admin-stats-grid">
        <div className="stat"><small>Clientes</small><strong>{totals.total}</strong></div>
        <div className="stat"><small>Ativos</small><strong>{totals.active}</strong></div>
        <div className="stat"><small>Atrasados</small><strong>{totals.overdue}</strong></div>
        <div className="stat"><small>Bloqueados</small><strong>{totals.blocked}</strong></div>
        <div className="stat"><small>Demos</small><strong>{totals.demo}</strong></div>
      </div>

      <section className="form-card compact">
        <label>Buscar cliente</label>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, e-mail, banca, cidade ou plano" />
        {message && <p className="message">{message}</p>}
      </section>



      <section className="section">
        <h3>Cadastros recentes</h3>
        <div className="list admin-list">
          {signups.slice(0, 5).map((signup) => (
            <article className="item-card admin-client-card" key={signup.id}>
              <div className="admin-client-head">
                <div>
                  <strong>{signup.stall_name || signup.full_name}</strong>
                  <span>{signup.full_name} · {signup.email}</span>
                  <small>{signup.phone || 'Sem celular'} · {[signup.city, signup.state].filter(Boolean).join(' - ') || 'Cidade não informada'}</small>
                </div>
                <b className="status-pill warning">{signup.payment_status || 'pending'}</b>
              </div>
              <div className="admin-client-grid">
                <span><b>Plano</b>{signup.plan_name}</span>
                <span><b>Data</b>{formatDateTime(signup.created_at)}</span>
              </div>
            </article>
          ))}
          {!signups.length && <p className="empty">Nenhum cadastro recente encontrado.</p>}
        </div>
      </section>

      {loading ? (
        <p className="empty">Carregando clientes...</p>
      ) : (
        <section className="list admin-list">
          {filteredClients.map((client) => (
            <article className="item-card admin-client-card" key={client.user_id}>
              <div className="admin-client-head">
                <div>
                  <strong>{client.stall_name || client.full_name || client.name || 'Cliente sem nome'}</strong>
                  <span>{client.full_name || client.name || 'Nome não informado'}</span>
                  <small>{client.email || 'E-mail não registrado'}</small>
                </div>
                <b className={`status-pill ${getStatusClass(client)}`}>{getStatusLabel(client)}</b>
              </div>

              <div className="admin-client-grid">
                <span><b>Plano</b>{client.plan_name || 'Manual'}</span>
                <span><b>Vencimento</b>{formatDate(client.current_period_end)}</span>
                <span><b>Carência</b>{formatDate(client.grace_until)}</span>
                <span><b>Último acesso</b>{formatDateTime(client.last_seen_at)}</span>
                <span><b>Acessos</b>{client.access_count || 0}</span>
                <span><b>Cidade</b>{[client.city, client.state].filter(Boolean).join(' - ') || '—'}</span>
              </div>

              <div className="card-actions">
                <button className="mini-btn" onClick={() => openEdit(client)}>Editar</button>
                {client.is_active ? (
                  <button className="mini-btn danger-text" onClick={() => quickBlock(client)}>Bloquear</button>
                ) : (
                  <button className="mini-btn" onClick={() => quickActivate(client)}>Ativar</button>
                )}
              </div>
            </article>
          ))}
          {!filteredClients.length && <p className="empty">Nenhum cliente encontrado.</p>}
        </section>
      )}

      {editing && (
        <div className="admin-modal-backdrop">
          <form className="admin-modal" onSubmit={saveEdit}>
            <h3>Editar cliente</h3>
            <p>{editing.name}<br /><small>{editing.email}</small></p>

            <label>Plano</label>
            <select value={editing.plan_key} onChange={(e) => setEditing({ ...editing, plan_key: e.target.value })}>
              {Object.entries(PLAN_OPTIONS).map(([key, plan]) => (
                <option value={key} key={key}>{plan.label}</option>
              ))}
            </select>

            <label>Status</label>
            <select value={editing.subscription_status} onChange={(e) => setEditing({ ...editing, subscription_status: e.target.value })} disabled={editing.read_only}>
              <option value="manual">Manual</option>
              <option value="pending">Pendente</option>
              <option value="active">Ativo</option>
              <option value="past_due">Atrasado</option>
              <option value="expired">Vencido</option>
              <option value="canceled">Cancelado</option>
            </select>

            <label>Vencimento</label>
            <input type="date" value={editing.current_period_end} onChange={(e) => setEditing({ ...editing, current_period_end: e.target.value })} />

            <label>Observação interna</label>
            <input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Ex.: pagamento confirmado manualmente" />

            <label className="check-row">
              <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
              Conta ativa
            </label>

            <label className="check-row">
              <input type="checkbox" checked={editing.read_only} onChange={(e) => setEditing({ ...editing, read_only: e.target.checked })} />
              Conta demo / somente visualização
            </label>

            <div className="inline-actions">
              <button className="mini-filled" type="submit">Salvar</button>
              <button className="mini-btn" type="button" onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}
