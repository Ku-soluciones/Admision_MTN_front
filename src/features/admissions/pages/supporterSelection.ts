type FamilyData = Record<string, unknown>;

export type SupporterSelection = {
  supporterRelation: string;
  supporterName: string;
  supporterEmail: string;
  supporterPhone: string;
  supporterRut: string;
};

export function applySupporterSelection(data: FamilyData, relation: string): SupporterSelection {
  const prefix = relation === 'padre' ? 'parent1' : relation === 'madre' ? 'parent2' : null;
  return {
    supporterRelation: relation,
    supporterName: prefix ? String(data[`${prefix}Name`] || '') : '',
    supporterEmail: prefix ? String(data[`${prefix}Email`] || '') : '',
    supporterPhone: prefix ? String(data[`${prefix}Phone`] || '') : '',
    supporterRut: prefix ? String(data[`${prefix}Rut`] || '') : '',
  };
}
