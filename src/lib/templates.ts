import type { Block, Character, SectionDef, SectionValue, Template, Relation } from './types'
import { uid } from './id'
import { defaultPixelOptions } from './avatar'

const now = () => new Date().toISOString()

// Plantilla base, sacada de la ficha original: información, apariencia, capacidades con detalles,
// habilidad especial con efectos y limitaciones, debilidades, amenaza y resumen.
// Se añaden historia, personalidad y relaciones, que sirven para escribir.
const standardSections: SectionDef[] = [
  {
    id: 'info',
    title: 'Información general',
    kind: 'fields',
    card: 'front',
    fields: [
      { id: 'edad', label: 'Edad', placeholder: '20 años', onCard: true },
      { id: 'raza', label: 'Raza / especie', placeholder: 'Humana', onCard: true },
      { id: 'sexo', label: 'Sexo / género', placeholder: 'Femenino' },
      { id: 'ocupacion', label: 'Ocupación', placeholder: 'Guerrera / cazadora', onCard: true },
      { id: 'mundo', label: 'Mundo / origen', placeholder: 'Un mundo dominado por la magia' }
    ]
  },
  {
    id: 'apariencia',
    title: 'Apariencia física',
    kind: 'fields',
    card: null,
    fields: [
      { id: 'altura', label: 'Altura', placeholder: '1,70 m' },
      { id: 'peso', label: 'Peso', placeholder: '65 kg' },
      { id: 'complexion', label: 'Complexión', placeholder: 'Atlética' },
      { id: 'cabello', label: 'Cabello', placeholder: 'Negro, corto' },
      { id: 'ojos', label: 'Ojos', placeholder: 'Verdes' }
    ]
  },
  {
    id: 'rasgos',
    title: 'Rasgos distintivos',
    kind: 'list',
    card: null,
    itemLabel: 'rasgo',
    hint: 'Cicatrices, tatuajes, gestos, cualquier cosa que lo haga reconocible.'
  },
  {
    id: 'personalidad',
    title: 'Personalidad',
    kind: 'text',
    card: null,
    hint: 'Cómo piensa, qué quiere, qué teme.'
  },
  {
    id: 'historia',
    title: 'Historia',
    kind: 'text',
    card: null,
    hint: 'Su trasfondo: de dónde viene y qué lo trajo hasta aquí.'
  },
  {
    id: 'capacidades',
    title: 'Capacidades',
    kind: 'blocks',
    card: 'front',
    itemLabel: 'capacidad',
    hint: 'Velocidad, fuerza, resistencia… La puntuación (1–10) se dibuja como barra en la carta.',
    block: { value: 'Valor', score: true, description: null, details: 'Detalles / ejemplos', notes: null }
  },
  {
    id: 'habilidades',
    title: 'Habilidades especiales',
    kind: 'blocks',
    card: 'back',
    itemLabel: 'habilidad',
    block: { value: null, score: false, description: 'Descripción', details: 'Efectos', notes: 'Limitaciones' }
  },
  {
    id: 'debilidades',
    title: 'Debilidades',
    kind: 'list',
    card: 'back',
    itemLabel: 'debilidad'
  },
  {
    id: 'relaciones',
    title: 'Relaciones',
    kind: 'relations',
    card: null,
    itemLabel: 'relación',
    hint: 'Otros personajes: puedes enlazar los que ya tengas creados.'
  },
  {
    id: 'amenaza',
    title: 'Nivel de amenaza',
    kind: 'text',
    card: 'front',
    hint: 'Qué tan peligroso es en su mundo, en una o dos frases.'
  },
  {
    id: 'resumen',
    title: 'Descripción resumida',
    kind: 'text',
    card: 'back',
    hint: 'Un párrafo corto que lo defina. Va en el reverso de la carta.'
  },
  {
    id: 'notas',
    title: 'Notas adicionales',
    kind: 'text',
    card: null
  }
]

const briefSections: SectionDef[] = [
  {
    id: 'info',
    title: 'Información general',
    kind: 'fields',
    card: 'front',
    fields: [
      { id: 'raza', label: 'Raza / especie', onCard: true },
      { id: 'ocupacion', label: 'Ocupación', onCard: true }
    ]
  },
  { id: 'resumen', title: 'Descripción', kind: 'text', card: 'back' },
  {
    id: 'habilidades',
    title: 'Habilidades',
    kind: 'blocks',
    card: 'front',
    itemLabel: 'habilidad',
    block: { value: null, score: true, description: 'Descripción', details: null, notes: null }
  },
  { id: 'historia', title: 'Historia', kind: 'text', card: null }
]

export const builtinTemplates: Template[] = [
  {
    id: 'builtin-estandar',
    ownerId: null,
    name: 'Ficha estándar',
    description: 'Completa: información, apariencia, capacidades, habilidades, debilidades, historia y relaciones.',
    sections: standardSections,
    builtin: true,
    updatedAt: '2026-11-08T00:00:00.000Z'
  },
  {
    id: 'builtin-breve',
    ownerId: null,
    name: 'Ficha breve',
    description: 'Lo justo para personajes secundarios: datos básicos, habilidades e historia.',
    sections: briefSections,
    builtin: true,
    updatedAt: '2026-11-08T00:00:00.000Z'
  }
]

export function emptyValue(section: SectionDef): SectionValue {
  switch (section.kind) {
    case 'fields': return { kind: 'fields', values: {} }
    case 'text': return { kind: 'text', text: '' }
    case 'list': return { kind: 'list', items: [] }
    case 'blocks': return { kind: 'blocks', blocks: [] }
    case 'relations': return { kind: 'relations', relations: [] }
  }
}

// Devuelve el valor de la sección; si falta o cambió de tipo, uno vacío
export function valueOf(character: Pick<Character, 'values'>, section: SectionDef): SectionValue {
  const value = character.values[section.id]
  return value && value.kind === section.kind ? value : emptyValue(section)
}

export const newBlock = (): Block => ({
  id: uid(), name: '', value: '', score: null, description: '', details: [], notes: ''
})

export const newRelation = (): Relation => ({
  id: uid(), characterId: null, name: '', type: '', description: ''
})

export function newSection(kind: SectionDef['kind']): SectionDef {
  const base = { id: uid(), title: 'Nueva sección', kind, card: null }
  if (kind === 'fields') return { ...base, fields: [{ id: uid(), label: 'Campo' }] }
  if (kind === 'blocks') {
    return { ...base, itemLabel: 'elemento', block: { value: 'Valor', score: false, description: 'Descripción', details: null, notes: null } }
  }
  return base
}

export function characterFromTemplate(template: Template, ownerId: string | null): Character {
  return {
    id: uid(),
    ownerId,
    worldId: null,
    name: '',
    alias: '',
    sections: structuredClone(template.sections),
    values: Object.fromEntries(template.sections.map((s) => [s.id, emptyValue(s)])),
    avatar: { mode: 'pixel', options: defaultPixelOptions(uid()) },
    style: { frame: 'dialogo', accent: '#d535d9' },
    visibility: 'private',
    createdAt: now(),
    updatedAt: now()
  }
}

export function copyTemplate(template: Template, ownerId: string | null): Template {
  return {
    ...structuredClone(template),
    id: uid(),
    ownerId,
    builtin: false,
    name: template.builtin ? `${template.name} (mía)` : `${template.name} (copia)`,
    updatedAt: now()
  }
}

// Personaje de ejemplo, genérico, para ver cómo queda una ficha llena
export function exampleCharacter(ownerId: string | null): Character {
  const c = characterFromTemplate(builtinTemplates[0], ownerId)
  const block = (b: Partial<Block>): Block => ({ ...newBlock(), ...b })
  c.name = 'Brann Holloway'
  c.alias = 'El Farolero'
  c.style = { frame: 'darkworld', accent: '#ffc425' }
  c.avatar = {
    mode: 'pixel',
    options: {
      ...defaultPixelOptions('brann'),
      hair: 'short02', hairColor: '83623b', skinColor: 'e0b687', eyes: 'variant04', eyesColor: '5b7c8b',
      mouth: 'happy08', clothing: 'variant12', clothingColor: '03396c', beard: 'variant01',
      hat: 'variant03', hatColor: '2e1e05', background: '1b1630'
    }
  }
  c.values = {
    info: { kind: 'fields', values: { edad: '34 años', raza: 'Humano', sexo: 'Masculino', ocupacion: 'Farolero / guardián', mundo: 'Velmora, una ciudad cubierta por una niebla que nunca se va' } },
    apariencia: { kind: 'fields', values: { altura: '1,82 m', peso: '78 kg', complexion: 'Delgada pero fibrosa', cabello: 'Castaño, siempre bajo un sombrero de ala ancha', ojos: 'Gris azulado' } },
    rasgos: { kind: 'list', items: ['Manos manchadas de hollín que ya no se limpian.', 'Silba la misma melodía mientras trabaja.', 'Una quemadura en forma de espiral en el antebrazo.'] },
    personalidad: { kind: 'text', text: 'Tranquilo, metódico y de pocas palabras. Desconfía de la gente que no tiene miedo a la niebla. Es amable con los niños y seco con todos los demás.' },
    historia: { kind: 'text', text: 'Heredó el oficio de su madre, la última farolera del distrito viejo. La noche en que ella no volvió de su ronda, Brann encontró su linterna encendida en medio de la calle, sin rastro de nadie. Desde entonces enciende los faroles de toda la ciudad, uno por uno, buscando la luz que ella dejó.' },
    capacidades: {
      kind: 'blocks',
      blocks: [
        block({ name: 'Percepción en la niebla', value: 'Ve hasta 40 m', score: 8, details: ['Distingue siluetas donde otros solo ven gris.', 'Oye pasos a varias calles de distancia.'] }),
        block({ name: 'Resistencia', value: 'Rondas de 12 horas', score: 6, details: ['Camina toda la noche sin descanso.'] }),
        block({ name: 'Fuerza', value: 'Humana, entrenada', score: 4 }),
        block({ name: 'Agilidad', value: 'Trepa faroles en segundos', score: 7 })
      ]
    },
    habilidades: {
      kind: 'blocks',
      blocks: [
        block({
          name: 'Llama guardiana',
          description: 'Su linterna arde con una luz que las criaturas de la niebla no soportan.',
          details: ['Las sombras retroceden dentro de su radio de luz.', 'Puede encender un farol a distancia con una chispa.'],
          notes: 'Si la llama se apaga, tarda una noche entera en volver a prenderla.'
        })
      ]
    },
    debilidades: { kind: 'list', items: ['Sin su linterna es un humano común.', 'No pelea bien en espacios abiertos y con luz de día.', 'Cualquier pista sobre su madre le hace perder el juicio.'] },
    relaciones: { kind: 'relations', relations: [{ ...newRelation(), name: 'Mara Holloway', type: 'Madre (desaparecida)', description: 'La última farolera del distrito viejo.' }] },
    amenaza: { kind: 'text', text: 'Bajo para la gente; un problema serio para cualquier cosa que viva en la niebla.' },
    resumen: { kind: 'text', text: 'El hombre que mantiene encendida una ciudad que prefiere la oscuridad. Cada farol que prende es una pregunta para la niebla, y algún día la niebla va a contestar.' },
    notas: { kind: 'text', text: '' }
  }
  return c
}
