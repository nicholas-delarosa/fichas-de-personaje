import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { SessionProvider } from './lib/session'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { CharacterPage } from './pages/CharacterPage'
import { NotFound } from './pages/NotFound'
import './styles/global.css'
import './styles/app.css'

// El editor (con el recortador de imágenes y DiceBear) se carga solo cuando hace falta
const EditorPage = lazy(() => import('./pages/EditorPage'))
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'))
const TemplateEditorPage = lazy(() => import('./pages/TemplateEditorPage'))
const WorldsPage = lazy(() => import('./pages/WorldsPage'))
const ExplorePage = lazy(() => import('./pages/ExplorePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <BrowserRouter>
        <Suspense fallback={<p className="page status-message">Cargando…</p>}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="nueva" element={<EditorPage />} />
              <Route path="ficha/:id" element={<CharacterPage />} />
              <Route path="ficha/:id/editar" element={<EditorPage />} />
              <Route path="plantillas" element={<TemplatesPage />} />
              <Route path="plantillas/:id" element={<TemplateEditorPage />} />
              <Route path="mundos" element={<WorldsPage />} />
              <Route path="explorar" element={<ExplorePage />} />
              <Route path="entrar" element={<LoginPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </SessionProvider>
  </StrictMode>
)
