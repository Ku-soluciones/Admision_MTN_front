import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { FiSave, FiArrowLeft, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { applicationService } from '../services/applicationService';
import { useAuth } from '../context/AuthContext';

interface ChildDescription {
  childName: string;
  description: string;
  dream: string;
}

interface ComplementaryFormData {
  // Datos que ya están en la postulación (solo lectura)
  email: string;
  studentLastNames: string;
  studentFirstNames: string;
  studentRut: string;
  currentSchool: string;
  gradeApplied: string;

  // Datos que deben completar
  otherSchools: string;
  fatherName: string;
  fatherEducation: string;
  fatherCurrentActivity: string;
  motherName: string;
  motherEducation: string;
  motherCurrentActivity: string;

  // Preguntas abiertas
  applicationReasons: string;
  schoolChangeReason: string;
  familyValues: string;
  faithExperiences: string;
  communityServiceExperiences: string;

  // Descripciones de hijos (array)
  childrenDescriptions: ChildDescription[];

  // Control de envío
  isSubmitted?: boolean;
  submittedAt?: string;
}

const ComplementaryApplicationForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ComplementaryFormData>({
    email: '',
    studentLastNames: '',
    studentFirstNames: '',
    studentRut: '',
    currentSchool: '',
    gradeApplied: '',
    otherSchools: '',
    fatherName: '',
    fatherEducation: '',
    fatherCurrentActivity: '',
    motherName: '',
    motherEducation: '',
    motherCurrentActivity: '',
    applicationReasons: '',
    schoolChangeReason: '',
    familyValues: '',
    faithExperiences: '',
    communityServiceExperiences: '',
    childrenDescriptions: [{ childName: '', description: '', dream: '' }]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    loadApplicationData();
  }, []);

  const loadApplicationData = async () => {
    try {
      setLoading(true);
      const dashboardData = await applicationService.getDashboardData();

      if (dashboardData && dashboardData.applications && dashboardData.applications.length > 0) {
        const app = dashboardData.applications[0];
        setApplicationId(app.id);

        // Pre-fill with existing data from application
        setFormData(prev => ({
          ...prev,
          email: user?.email || app.applicantUser?.email || '',
          studentLastNames: app.student?.lastName || '',
          studentFirstNames: app.student?.firstName || '',
          studentRut: app.student?.rut || '',
          currentSchool: app.student?.currentSchool || '',
          gradeApplied: app.student?.gradeApplied || '',
          fatherName: app.father?.fullName || '',
          motherName: app.mother?.fullName || ''
        }));

        // Try to load existing complementary form if it exists
        try {
          const complementaryData = await applicationService.getComplementaryForm(app.id);
          if (complementaryData) {
            setFormData(prev => ({
              ...prev,
              ...complementaryData
            }));

            // Check if form was already submitted
            if (complementaryData.isSubmitted || complementaryData.is_submitted) {
              setIsReadOnly(true);
            }
          }
        } catch (error) {
          // Complementary form doesn't exist yet, that's okay
          console.log('No existing complementary form found');
        }
      }
    } catch (error) {
      console.error('Error loading application data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ComplementaryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleChildChange = (index: number, field: keyof ChildDescription, value: string) => {
    const newChildren = [...formData.childrenDescriptions];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setFormData(prev => ({ ...prev, childrenDescriptions: newChildren }));
  };

  const addChild = () => {
    setFormData(prev => ({
      ...prev,
      childrenDescriptions: [...prev.childrenDescriptions, { childName: '', description: '', dream: '' }]
    }));
  };

  const removeChild = (index: number) => {
    if (formData.childrenDescriptions.length > 1) {
      setFormData(prev => ({
        ...prev,
        childrenDescriptions: prev.childrenDescriptions.filter((_, i) => i !== index)
      }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.fatherEducation) newErrors.fatherEducation = 'Este campo es requerido';
    if (!formData.fatherCurrentActivity) newErrors.fatherCurrentActivity = 'Este campo es requerido';
    if (!formData.motherEducation) newErrors.motherEducation = 'Este campo es requerido';
    if (!formData.motherCurrentActivity) newErrors.motherCurrentActivity = 'Este campo es requerido';
    if (!formData.applicationReasons) newErrors.applicationReasons = 'Este campo es requerido';
    if (!formData.schoolChangeReason) newErrors.schoolChangeReason = 'Este campo es requerido';
    if (!formData.familyValues) newErrors.familyValues = 'Este campo es requerido';
    if (!formData.faithExperiences) newErrors.faithExperiences = 'Este campo es requerido';
    if (!formData.communityServiceExperiences) newErrors.communityServiceExperiences = 'Este campo es requerido';

    // Validate children descriptions
    formData.childrenDescriptions.forEach((child, index) => {
      if (!child.childName) newErrors[`child_${index}_name`] = 'Nombre requerido';
      if (!child.description) newErrors[`child_${index}_description`] = 'Descripción requerida';
      if (!child.dream) newErrors[`child_${index}_dream`] = 'Sueño requerido';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, isSubmitting: boolean = false) => {
    e.preventDefault();

    if (isSubmitting && !validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!applicationId) {
      alert('No se encontró una postulación activa');
      return;
    }

    // Confirmation for final submission
    if (isSubmitting) {
      const confirmed = window.confirm(
        '¿Está seguro que desea enviar el formulario? Una vez enviado, no podrá realizar más modificaciones.'
      );
      if (!confirmed) return;
    }

    try {
      setSaving(true);
      await applicationService.saveComplementaryForm(applicationId, {
        ...formData,
        isSubmitted: isSubmitting
      });

      if (isSubmitting) {
        setSuccess(true);
        // Show success message and redirect after 2 seconds
        setTimeout(() => {
          navigate('/dashboard-apoderado');
        }, 2000);
      } else {
        // Just saved as draft - show success message briefly
        alert('Borrador guardado exitosamente');
        setSaving(false);
      }
    } catch (error: any) {
      console.error('Error saving complementary form:', error);
      if (error.response?.status === 403) {
        alert('Este formulario ya fue enviado y no puede ser modificado');
        setIsReadOnly(true);
      } else {
        alert('Error al guardar el formulario. Por favor, inténtelo nuevamente.');
      }
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen py-12 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azul-monte-tabor mx-auto mb-4"></div>
          <p className="text-gris-piedra">Cargando formulario...</p>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-gray-50 min-h-screen py-12 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-verde-esperanza rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheck className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-verde-esperanza mb-2">¡Formulario Guardado!</h2>
          <p className="text-gris-piedra">Su formulario complementario ha sido guardado exitosamente.</p>
          <p className="text-sm text-gris-piedra mt-2">Redirigiendo al dashboard...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="p-4 sm:p-6 mb-6 bg-gradient-to-r from-azul-monte-tabor to-blue-700 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold mb-2">Formulario Complementario de Postulación</h1>
              <p className="text-blue-100">Complete la siguiente información sobre su familia y motivaciones</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard-apoderado')}
              className="text-white border-white hover:bg-white hover:text-azul-monte-tabor"
            >
              <FiArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>
        </Card>

        {/* Important Notice */}
        {!isReadOnly && (
          <Card className="p-4 bg-yellow-50 border border-yellow-300">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Importante</h3>
                <p className="text-sm text-yellow-800 mb-1">
                  Este formulario debe ser completado y <strong>enviado antes de la entrevista familiar</strong>.
                </p>
                <p className="text-sm text-yellow-800">
                  Puede guardar un borrador para continuar más tarde, pero recuerde enviarlo antes de su entrevista.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Read-only Notice */}
        {isReadOnly && (
          <Card className="p-4 bg-blue-50 border border-blue-300">
            <div className="flex items-start gap-3">
              <FiCheck className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">✓ Formulario Enviado</h3>
                <p className="text-sm text-blue-800">
                  Este formulario ya fue enviado el {formData.submittedAt ? new Date(formData.submittedAt).toLocaleDateString('es-CL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'anteriormente'}. No se pueden realizar más modificaciones.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Form */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {/* Datos de referencia (solo lectura) */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">Datos de Referencia</h2>
            <p className="text-sm text-gris-piedra mb-4">Estos datos provienen de su postulación inicial</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-1">Email</label>
                <input
                  type="text"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gris-piedra"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-1">RUT Postulante</label>
                <input
                  type="text"
                  value={formData.studentRut}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gris-piedra"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-1">Apellidos Postulante</label>
                <input
                  type="text"
                  value={formData.studentLastNames}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gris-piedra"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-1">Nombres Postulante</label>
                <input
                  type="text"
                  value={formData.studentFirstNames}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gris-piedra"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-1">Colegio Actual</label>
                <input
                  type="text"
                  value={formData.currentSchool}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gris-piedra"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-1">Curso al que Postula</label>
                <input
                  type="text"
                  value={formData.gradeApplied}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gris-piedra"
                />
              </div>
            </div>
          </Card>

          {/* Otros colegios */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">Postulaciones Adicionales</h2>
            <Input
              label="Otros colegios a los que postula"
              id="otherSchools"
              value={formData.otherSchools}
              onChange={(e) => handleChange('otherSchools', e.target.value)}
              placeholder="Ej: Colegio San Agustín, Colegio Villa María"
              helpText="Si no postula a otros colegios, escriba 'No postula a otros colegios'"
            />
          </Card>

          {/* Información de los Padres */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">👨‍👩‍👧‍👦 Información de los Padres</h2>

            <div className="space-y-6">
              {/* Padre */}
              <div>
                <h3 className="text-lg font-semibold text-azul-monte-tabor mb-3">Padre</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gris-piedra mb-1">Nombre (referencia)</label>
                    <input
                      type="text"
                      value={formData.fatherName}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gris-piedra"
                    />
                  </div>
                  <Input
                    label="Educación escolar y superior"
                    id="fatherEducation"
                    value={formData.fatherEducation}
                    onChange={(e) => handleChange('fatherEducation', e.target.value)}
                    placeholder="Ej: Colegio Verbo Divino - Ing. en Acuicultura - Universidad Andres Bello"
                    isRequired
                    error={errors.fatherEducation}
                  />
                  <Input
                    label="Actividad actual"
                    id="fatherCurrentActivity"
                    value={formData.fatherCurrentActivity}
                    onChange={(e) => handleChange('fatherCurrentActivity', e.target.value)}
                    placeholder="Ej: Exportador y comercializador de alimentos congelados"
                    isRequired
                    error={errors.fatherCurrentActivity}
                  />
                </div>
              </div>

              {/* Madre */}
              <div>
                <h3 className="text-lg font-semibold text-azul-monte-tabor mb-3">Madre</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gris-piedra mb-1">Nombre (referencia)</label>
                    <input
                      type="text"
                      value={formData.motherName}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gris-piedra"
                    />
                  </div>
                  <Input
                    label="Educación escolar y superior"
                    id="motherEducation"
                    value={formData.motherEducation}
                    onChange={(e) => handleChange('motherEducation', e.target.value)}
                    placeholder="Ej: Colegio Francisco de Asis - Gastronomia en Culinary - Ing. Comercial en Gabriela Mistral"
                    isRequired
                    error={errors.motherEducation}
                  />
                  <Input
                    label="Actividad actual"
                    id="motherCurrentActivity"
                    value={formData.motherCurrentActivity}
                    onChange={(e) => handleChange('motherCurrentActivity', e.target.value)}
                    placeholder="Ej: Dueña de Casa"
                    isRequired
                    error={errors.motherCurrentActivity}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Preguntas sobre la familia */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">💭 Preguntas sobre su Familia</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-1">
                  1. Indiquen los motivos de su postulación a los colegios Monte Tabor y Nazaret <span className="text-rojo-sagrado">*</span>
                </label>
                <p className="text-xs text-gris-piedra mb-2">Se sugieren tres motivos</p>
                <textarea
                  id="applicationReasons"
                  value={formData.applicationReasons}
                  onChange={(e) => handleChange('applicationReasons', e.target.value)}
                  rows={6}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 ${
                    errors.applicationReasons
                      ? 'border-rojo-sagrado focus:ring-rojo-sagrado'
                      : 'border-gray-300 focus:border-azul-monte-tabor focus:ring-azul-monte-tabor'
                  }`}
                  placeholder="Explique los motivos por los cuales desea postular a los colegios Monte Tabor y Nazaret..."
                />
                {errors.applicationReasons && <p className="mt-1 text-xs text-rojo-sagrado">{errors.applicationReasons}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-1">
                  2. Indique el motivo de cambio de colegio <span className="text-rojo-sagrado">*</span>
                </label>
                <textarea
                  id="schoolChangeReason"
                  value={formData.schoolChangeReason}
                  onChange={(e) => handleChange('schoolChangeReason', e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 ${
                    errors.schoolChangeReason
                      ? 'border-rojo-sagrado focus:ring-rojo-sagrado'
                      : 'border-gray-300 focus:border-azul-monte-tabor focus:ring-azul-monte-tabor'
                  }`}
                  placeholder="Explique el motivo del cambio de colegio..."
                />
                {errors.schoolChangeReason && <p className="mt-1 text-xs text-rojo-sagrado">{errors.schoolChangeReason}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-1">
                  3. Pensando en su familia: ¿Qué es importante para ustedes? <span className="text-rojo-sagrado">*</span>
                </label>
                <textarea
                  id="familyValues"
                  value={formData.familyValues}
                  onChange={(e) => handleChange('familyValues', e.target.value)}
                  rows={5}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 ${
                    errors.familyValues
                      ? 'border-rojo-sagrado focus:ring-rojo-sagrado'
                      : 'border-gray-300 focus:border-azul-monte-tabor focus:ring-azul-monte-tabor'
                  }`}
                  placeholder="Comparta los valores y principios importantes para su familia..."
                />
                {errors.familyValues && <p className="mt-1 text-xs text-rojo-sagrado">{errors.familyValues}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-1">
                  4. ¿Qué experiencias de fe tienen como familia? <span className="text-rojo-sagrado">*</span>
                </label>
                <textarea
                  id="faithExperiences"
                  value={formData.faithExperiences}
                  onChange={(e) => handleChange('faithExperiences', e.target.value)}
                  rows={6}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 ${
                    errors.faithExperiences
                      ? 'border-rojo-sagrado focus:ring-rojo-sagrado'
                      : 'border-gray-300 focus:border-azul-monte-tabor focus:ring-azul-monte-tabor'
                  }`}
                  placeholder="Comparta las experiencias de fe que han vivido como familia..."
                />
                {errors.faithExperiences && <p className="mt-1 text-xs text-rojo-sagrado">{errors.faithExperiences}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-1">
                  5. ¿Qué experiencias de ayuda, aporte o servicio a la sociedad han tenido? <span className="text-rojo-sagrado">*</span>
                </label>
                <textarea
                  id="communityServiceExperiences"
                  value={formData.communityServiceExperiences}
                  onChange={(e) => handleChange('communityServiceExperiences', e.target.value)}
                  rows={6}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 ${
                    errors.communityServiceExperiences
                      ? 'border-rojo-sagrado focus:ring-rojo-sagrado'
                      : 'border-gray-300 focus:border-azul-monte-tabor focus:ring-azul-monte-tabor'
                  }`}
                  placeholder="Comparta las experiencias de servicio a la comunidad que han tenido..."
                />
                {errors.communityServiceExperiences && <p className="mt-1 text-xs text-rojo-sagrado">{errors.communityServiceExperiences}</p>}
              </div>
            </div>
          </Card>

          {/* Descripción de los hijos */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-azul-monte-tabor">👶 Descripción de sus Hijos</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChild}
              >
                Agregar Hijo/a
              </Button>
            </div>

            <div className="space-y-6">
              {formData.childrenDescriptions.map((child, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-azul-monte-tabor">Hijo/a #{index + 1}</h3>
                    {formData.childrenDescriptions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChild(index)}
                        className="text-rojo-sagrado hover:text-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Input
                      label="Nombre del hijo/a"
                      id={`child_${index}_name`}
                      value={child.childName}
                      onChange={(e) => handleChildChange(index, 'childName', e.target.value)}
                      placeholder="Nombre completo"
                      isRequired
                      error={errors[`child_${index}_name`]}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gris-piedra mb-1">
                        6. ¿Cómo describe a {child.childName || 'su hijo/a'}? <span className="text-rojo-sagrado">*</span>
                      </label>
                      <textarea
                        value={child.description}
                        onChange={(e) => handleChildChange(index, 'description', e.target.value)}
                        rows={4}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 ${
                          errors[`child_${index}_description`]
                            ? 'border-rojo-sagrado focus:ring-rojo-sagrado'
                            : 'border-gray-300 focus:border-azul-monte-tabor focus:ring-azul-monte-tabor'
                        }`}
                        placeholder="Describa la personalidad, intereses y características de su hijo/a..."
                      />
                      {errors[`child_${index}_description`] && (
                        <p className="mt-1 text-xs text-rojo-sagrado">{errors[`child_${index}_description`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gris-piedra mb-1">
                        7. ¿Qué sueña para {child.childName || 'este hijo/a'} en particular? <span className="text-rojo-sagrado">*</span>
                      </label>
                      <textarea
                        value={child.dream}
                        onChange={(e) => handleChildChange(index, 'dream', e.target.value)}
                        rows={4}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 ${
                          errors[`child_${index}_dream`]
                            ? 'border-rojo-sagrado focus:ring-rojo-sagrado'
                            : 'border-gray-300 focus:border-azul-monte-tabor focus:ring-azul-monte-tabor'
                        }`}
                        placeholder="Comparta sus sueños y aspiraciones para su hijo/a..."
                      />
                      {errors[`child_${index}_dream`] && (
                        <p className="mt-1 text-xs text-rojo-sagrado">{errors[`child_${index}_dream`]}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Error Summary */}
          {Object.keys(errors).length > 0 && (
            <Card className="p-4 bg-red-50 border border-red-200">
              <div className="flex items-start gap-2">
                <FiAlertCircle className="w-5 h-5 text-rojo-sagrado flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rojo-sagrado">Por favor, complete todos los campos requeridos</p>
                  <p className="text-sm text-red-700 mt-1">Hay {Object.keys(errors).length} campo(s) que requieren su atención</p>
                </div>
              </div>
            </Card>
          )}

          {/* Submit Buttons */}
          {!isReadOnly ? (
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard-apoderado')}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="outline"
                disabled={saving}
                className="border-azul-monte-tabor text-azul-monte-tabor hover:bg-azul-monte-tabor hover:text-white"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-azul-monte-tabor mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4 mr-2" />
                    Guardar Borrador
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={(e) => handleSubmit(e as any, true)}
                disabled={saving}
                className="bg-verde-esperanza hover:bg-green-700"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <FiCheck className="w-4 h-4 mr-2" />
                    Enviar y Cerrar
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="primary"
                onClick={() => navigate('/dashboard-apoderado')}
              >
                <FiArrowLeft className="w-4 h-4 mr-2" />
                Volver al Dashboard
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ComplementaryApplicationForm;
