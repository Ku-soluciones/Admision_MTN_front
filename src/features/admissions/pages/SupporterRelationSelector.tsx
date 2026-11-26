import React, { useState } from 'react';
import Select from '../../admin/components/ui/Select';
import { ConfirmDialog } from '../../../packages/shared-ui/src/components/ui/ConfirmDialog';

type SupporterRelationSelectorProps = {
  isPrekinder: boolean;
  value: string;
  error?: string;
  onCommit: (relation: string) => void;
  onBlur: () => void;
};

const options = [
  { value: 'padre', label: 'Padre' },
  { value: 'madre', label: 'Madre' },
  { value: 'abuelo', label: 'Abuelo/a' },
  { value: 'tio', label: 'Tío/a' },
  { value: 'hermano', label: 'Hermano/a' },
  { value: 'tutor', label: 'Tutor Legal' },
  { value: 'otro', label: 'Otro' },
];

const SupporterRelationSelector: React.FC<SupporterRelationSelectorProps> = ({
  isPrekinder,
  value,
  error,
  onCommit,
  onBlur,
}) => {
  const [pendingRelation, setPendingRelation] = useState<string | null>(null);

  const requestChange = (relation: string) => {
    if (!isPrekinder) {
      onCommit(relation);
      return;
    }
    setPendingRelation(relation || null);
  };

  const confirm = () => {
    if (!pendingRelation) return;
    onCommit(pendingRelation);
    setPendingRelation(null);
  };

  return (
    <>
      <Select
        id="supporter-relation"
        label="Parentesco con el postulante"
        options={options}
        isRequired
        value={value}
        onChange={(event) => requestChange(event.target.value)}
        onBlur={onBlur}
        error={error}
      />
      <ConfirmDialog
        isOpen={pendingRelation !== null}
        title="Confirmar sostenedor económico"
        message="¿Estás seguro de que esta persona será el sostenedor económico? Será responsable del pago de las colegiaturas durante todo el tiempo que el alumno permanezca en el colegio."
        confirmText="Sí, confirmar"
        cancelText="Cancelar"
        variant="warning"
        onConfirm={confirm}
        onClose={() => setPendingRelation(null)}
      />
    </>
  );
};

export default SupporterRelationSelector;
