import {
  DEFAULT_HOME_LATEST_SECTIONS,
  normalizeHomeLatestSection,
  type HomeLatestSection,
} from '@/lib/homeSections'
import type { HomeLatestSupabaseClient } from './client'

export function asValidSections(rows: unknown): HomeLatestSection[] {
  if (!Array.isArray(rows)) return []

  return rows
    .map((row) => normalizeHomeLatestSection(row as Partial<HomeLatestSection>))
    .filter((row): row is HomeLatestSection => row !== null)
    .sort((a, b) => a.display_order - b.display_order)
}

export async function getHomeLatestSections(
  supabase: HomeLatestSupabaseClient
): Promise<HomeLatestSection[]> {
  const { data, error } = await supabase
    .from('home_latest_sections')
    .select('section_key, section_name, section_type, parent_key, is_visible, display_order, limit_count')
    .order('display_order', { ascending: true })
    .order('section_key', { ascending: true })

  if (error) {
    console.error('Failed to load homepage latest sections:', error)
    return DEFAULT_HOME_LATEST_SECTIONS
  }

  const sections = asValidSections(data)
  return sections.length > 0 ? sections : DEFAULT_HOME_LATEST_SECTIONS
}

export function getSectionMap(sections: HomeLatestSection[]) {
  return new Map(sections.map((section) => [section.section_key, section]))
}

export function getMainSectionLimit(
  sectionMap: Map<string, HomeLatestSection>,
  key: string,
  fallback: number
) {
  const value = sectionMap.get(key)?.limit_count
  return typeof value === 'number' && value > 0 ? Math.min(30, value) : fallback
}

export function isSectionVisible(sectionMap: Map<string, HomeLatestSection>, key: string) {
  return sectionMap.get(key)?.is_visible === true
}
