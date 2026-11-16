/**
 * Equipos: los equipos del entrenador (GET /teams), cada uno con sus seis huecos,
 * y las acciones de editar y descargar en PDF (GET /teams/{id}/export).
 * La API no tiene un endpoint para borrar equipos, así que la web tampoco lo ofrece.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Team } from '../api/types'
import { TeamSlots } from '../components/TeamSlots'
import { useToast } from '../components/Toast'
import { formatDate } from '../lib/format'
import { MAX_TEAM } from '../lib/teams'
import './TeamsPage.css'

export function TeamsPage() {
  const toast = useToast()
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<number | null>(null)

  useEffect(() => {
    api.teams()
      .then(setTeams)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se han podido cargar tus equipos.'))
  }, [])

  async function download(team: Team) {
    setDownloading(team.id)
    try { await api.downloadTeam(team.id) } catch (err) {
      toast(err instanceof ApiError ? err.message : 'No se ha podido descargar el PDF.', 'error')
    } finally { setDownloading(null) }
  }

  return (
    <div className="teams">
      <div className="title-row">
        <div>
          <h1 className="page-title">Equipos</h1>
          <p className="muted">
            {teams === null ? 'Cargando…' : teams.length === 0 ? 'Aún no tienes equipos.'
              : `${teams.length} ${teams.length === 1 ? 'equipo' : 'equipos'} de hasta ${MAX_TEAM} Pokémon.`}
          </p>
        </div>
        {teams !== null && teams.length > 0 && (
          <div className="title-row__actions">
            <Link to="/equipos/nuevo" className="btn btn-primary">Nuevo equipo</Link>
          </div>
        )}
      </div>

      {error && <p className="alert" role="alert">{error}</p>}

      {teams === null && !error && <div className="card skel" style={{ height: 140 }} aria-busy="true" />}

      {teams?.length === 0 && (
        <section className="card teams__empty">
          <TeamSlots members={[]} size={56} />
          <p className="card-title">Monta tu primer equipo</p>
          <p className="muted">Elige hasta seis Pokémon de tu Pokédex. Luego podrás usarlo en las batallas.</p>
          <Link to="/equipos/nuevo" className="btn btn-primary">Nuevo equipo</Link>
        </section>
      )}

      <ul className="teams__list">
        {teams?.map((t) => (
          <li key={t.id} className="card team-card">
            <div className="team-card__info">
              <h2 className="team-card__name">{t.name}</h2>
              {t.description && <p className="muted">{t.description}</p>}
              <p className="faint team-card__meta num">
                {t.members.length} de {MAX_TEAM} · creado el {formatDate(t.created_at)}
              </p>
            </div>
            <TeamSlots members={t.members} />
            <div className="team-card__actions">
              <Link to={`/equipos/${t.id}`} className="btn">Editar</Link>
              <button type="button" className="btn" onClick={() => download(t)} disabled={downloading === t.id}>
                {downloading === t.id && <span className="spinner" aria-hidden="true" />}PDF
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
