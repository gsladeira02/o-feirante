import { useEffect, useMemo, useState } from 'react'
import { updateProfileData } from '../services/api'
import { supabase } from '../supabase'

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function valueOrEmpty(value) {
  return value == null ? '' : String(value)
}

export default function Perfil({ user, profile, reload, readOnly = false, onBlockedAction }) {
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const defaults = useMemo(() => ({
    full_name: profile?.full_name || profile?.name || '',
    cpf: profile?.cpf || '',
    birth_date: profile?.birth_date || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    state: profile?.state || '',
    stall_name: profile?.stall_name || '',
    cnpj: profile?.cnpj || '',
  }), [profile])

  useEffect(() => {
    setFormKey((current) => current + 1)
  }, [defaults.full_name, defaults.cpf, defaults.birth_date, defaults.phone, defaults.city, defaults.state, defaults.stall_name, defaults.cnpj])

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
      return
    }

    const form = event.currentTarget
    const data = new FormData(form)
    const payload = {
      id: user.id,
      full_name: String(data.get('full_name') || '').trim(),
      cpf: onlyDigits(data.get('cpf')),
      birth_date: String(data.get('birth_date') || ''),
      phone: onlyDigits(data.get('phone')),
      city: String(data.get('city') || '').trim(),
      state: String(data.get('state') || '').trim().toUpperCase(),
      stall_name: String(data.get('stall_name') || '').trim(),
      cnpj: onlyDigits(data.get('cnpj')),
    }

    setSaving(true)
    try {
      await updateProfileData(payload)
      await reload(user)
      setMessage('Dados cadastrais atualizados com sucesso.')
    } catch (error) {
      setMessage(error.message || 'Não foi possível atualizar os dados.')
    } finally {
      setSaving(false)
    }
  }



  async function submitPassword(event) {
    event.preventDefault()
    setPasswordMessage('')

    if (readOnly) {
      setPasswordMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
      return
    }

    if (!supabase) {
      setPasswordMessage('Não foi possível conectar ao sistema agora. Tente novamente em instantes.')
      return
    }

    const form = event.currentTarget
    const data = new FormData(form)
    const currentPassword = String(data.get('current_password') || '')
    const newPassword = String(data.get('new_password') || '')
    const confirmPassword = String(data.get('confirm_password') || '')

    if (!user?.email) {
      setPasswordMessage('Não foi possível identificar o e-mail da conta. Saia e entre novamente.')
      return
    }

    if (!currentPassword) {
      setPasswordMessage('Informe sua senha atual.')
      return
    }

    if (newPassword.length < 6) {
      setPasswordMessage('A nova senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('A confirmação da senha não confere.')
      return
    }

    setSavingPassword(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (signInError) {
        throw new Error('Senha atual incorreta.')
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw updateError
      }

      form.reset()
      setPasswordMessage('Senha alterada com sucesso.')
    } catch (error) {
      setPasswordMessage(error.message || 'Não foi possível alterar a senha agora.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <main className="page profile-page">
      <h2>Dados cadastrais</h2>
      <p className="muted">Atualize os dados do responsável e da banca quando precisar.</p>

      <section className="profile-summary-card">
        <div>
          <small>E-mail de acesso</small>
          <strong>{user?.email || 'E-mail não informado'}</strong>
          <span>Para alterar o e-mail de login, use o canal oficial de atendimento.</span>
        </div>
      </section>

      <form className="form-card" onSubmit={submit} key={formKey}>
        <h3>Responsável</h3>

        <label>Nome completo</label>
        <input name="full_name" defaultValue={valueOrEmpty(defaults.full_name)} autoComplete="name" required />

        <div className="row">
          <div>
            <label>CPF</label>
            <input name="cpf" inputMode="numeric" defaultValue={valueOrEmpty(defaults.cpf)} placeholder="Somente números" autoComplete="off" />
          </div>
          <div>
            <label>Data de nascimento</label>
            <input name="birth_date" type="date" defaultValue={valueOrEmpty(defaults.birth_date)} />
          </div>
        </div>

        <label>Celular</label>
        <input name="phone" inputMode="tel" defaultValue={valueOrEmpty(defaults.phone)} placeholder="DDD + número" autoComplete="tel" />

        <h3>Banca</h3>

        <label>Nome da banca</label>
        <input name="stall_name" defaultValue={valueOrEmpty(defaults.stall_name)} required />

        <div className="row">
          <div>
            <label>Cidade</label>
            <input name="city" defaultValue={valueOrEmpty(defaults.city)} required />
          </div>
          <div>
            <label>Estado</label>
            <input name="state" maxLength={2} defaultValue={valueOrEmpty(defaults.state)} placeholder="ES" required />
          </div>
        </div>

        <label>CNPJ da banca <span className="optional-label">opcional</span></label>
        <input name="cnpj" inputMode="numeric" defaultValue={valueOrEmpty(defaults.cnpj)} placeholder="Somente números" autoComplete="off" />

        {message && <p className="message">{message}</p>}

        <button className="primary-btn" disabled={saving}>{saving ? 'Salvando...' : 'Salvar dados cadastrais'}</button>
      </form>

      <form className="form-card password-card" onSubmit={submitPassword}>
        <h3>Alterar senha</h3>
        <p className="muted small-note">Troque sua senha de acesso quando precisar.</p>

        <label>Senha atual</label>
        <input name="current_password" type="password" autoComplete="current-password" placeholder="Digite sua senha atual" required />

        <label>Nova senha</label>
        <input name="new_password" type="password" autoComplete="new-password" placeholder="Mínimo de 6 caracteres" minLength={6} required />

        <label>Confirmar nova senha</label>
        <input name="confirm_password" type="password" autoComplete="new-password" placeholder="Digite novamente a nova senha" minLength={6} required />

        {passwordMessage && <p className="message">{passwordMessage}</p>}

        <button className="secondary-btn full-width" disabled={savingPassword}>{savingPassword ? 'Alterando...' : 'Alterar senha'}</button>
      </form>
    </main>
  )
}
