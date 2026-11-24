'use client';

// US3.1 / US3.3: formulario «Consigne su propiedad». Es el único formulario del sitio.
// No persiste nada (AC3.1.7): el estado vive solo en memoria y no hay CAPTCHA.
// Toda la lógica de validación y envío está en src/lib/consignment (funciones puras con tests).

import { useRef, useState, type FormEvent } from 'react';
import { Checkbox, NativeSelect, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useTranslations } from 'next-intl';
import { DEPARTAMENTOS, municipiosDe } from '@/lib/consignment/locations';
import { submitConsignment } from '@/lib/consignment/submit';
import {
  TIPOS_INMUEBLE,
  validateConsignment,
  type ConsignmentFormValues,
  type FieldErrorKey,
  type FieldName,
  type Idioma,
  type TipoInmueble,
} from '@/lib/consignment/validate';
import { buildConsignmentWhatsappUrl } from '@/lib/consignment/whatsapp-message';
import styles from './ConsignmentForm.module.css';

type ConsignmentFormProps = {
  readonly locale: Idioma;
  /** Número de WhatsApp ya normalizado (solo dígitos) o null si no está configurado (T3). */
  readonly whatsappNumber: string | null;
  /** Enlace a la Política de Tratamiento de Datos del idioma de la página (AC3.3.1). */
  readonly dataPolicyHref: string;
};

type Notice = 'invalid' | 'rateLimited' | 'generic' | 'emailFailed';

const INITIAL_VALUES: ConsignmentFormValues = {
  nombre: '',
  telefono: '',
  email: '',
  tipo: '',
  departamento: '',
  municipio: '',
  valor: '',
  areaConstruida: '',
  areaLote: '',
  mensaje: '',
  consent: false,
  sitio: '',
};

const fieldClasses = {
  root: styles.field,
  label: styles.label,
  input: styles.input,
  error: styles.error,
};

export function ConsignmentForm({ locale, whatsappNumber, dataPolicyHref }: ConsignmentFormProps) {
  const t = useTranslations('consign');
  const form = useForm<ConsignmentFormValues>({
    mode: 'controlled',
    initialValues: INITIAL_VALUES,
  });
  const [succeeded, setSucceeded] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const errorText = (key: FieldErrorKey): string => {
    switch (key) {
      case 'required':
        return t('errors.required');
      case 'invalidEmail':
        return t('errors.invalidEmail');
      case 'invalidPhone':
        return t('errors.invalidPhone');
      case 'invalidNumber':
        return t('errors.invalidNumber');
      case 'invalidOption':
        return t('errors.invalidOption');
      case 'consentRequired':
        return t('errors.consentRequired');
    }
  };

  const tipoLabel = (tipo: TipoInmueble): string => {
    switch (tipo) {
      case 'CASA':
        return t('types.CASA');
      case 'APARTAMENTO':
        return t('types.APARTAMENTO');
      case 'LOTE_CAMPESTRE':
        return t('types.LOTE_CAMPESTRE');
      case 'LOTE_URBANO':
        return t('types.LOTE_URBANO');
      case 'FINCA':
        return t('types.FINCA');
      case 'LOCAL_COMERCIAL':
        return t('types.LOCAL_COMERCIAL');
      case 'BODEGA':
        return t('types.BODEGA');
      case 'OFICINA':
        return t('types.OFICINA');
    }
  };

  const noticeText = (value: Exclude<Notice, 'emailFailed'>): string => {
    switch (value) {
      case 'invalid':
        return t('formErrors.invalid');
      case 'rateLimited':
        return t('formErrors.rateLimited');
      case 'generic':
        return t('formErrors.generic');
    }
  };

  const translateErrors = (errors: Partial<Record<FieldName, FieldErrorKey>>) => {
    const messages: Partial<Record<FieldName, string>> = {};
    for (const field of Object.keys(errors) as FieldName[]) {
      const key = errors[field];
      if (key !== undefined) messages[field] = errorText(key);
    }
    return messages;
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return; // AC3.1.6: una solicitud a la vez.

    setNotice(null);
    setFallbackUrl(null);

    // AC3.1.2: errores junto a cada campo con form.setErrors(), sin notificación flotante.
    const validation = validateConsignment(form.getValues(), locale);
    if (!validation.ok) {
      form.setErrors(translateErrors(validation.errors));
      return;
    }
    form.clearErrors();

    inFlight.current = true;
    setPending(true);
    try {
      const outcome = await submitConsignment(validation.payload);
      switch (outcome.status) {
        case 'success':
          setSucceeded(true);
          break;
        case 'email_failed':
          // AC3.1.5: se conservan los datos y se ofrece el respaldo; abrir WhatsApp es acción del usuario.
          setNotice('emailFailed');
          if (whatsappNumber !== null) {
            setFallbackUrl(
              buildConsignmentWhatsappUrl({ number: whatsappNumber, payload: validation.payload }),
            );
          }
          break;
        case 'consent_required':
          form.setErrors({ consent: errorText('consentRequired') });
          break;
        case 'invalid':
          setNotice('invalid');
          break;
        case 'rate_limited':
          setNotice('rateLimited');
          break;
        case 'error':
          setNotice('generic');
          break;
      }
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  if (succeeded) {
    // AC3.1.4: confirmación en el idioma de la página, sin botón de WhatsApp.
    return (
      <div className={styles.success} role="status">
        <h2 className={styles.successTitle}>{t('success.title')}</h2>
        <p className={styles.successBody}>{t('success.body')}</p>
      </div>
    );
  }

  const municipios = municipiosDe(form.values.departamento);
  const selectPlaceholder = { value: '', label: t('placeholders.select') };

  return (
    <form className={styles.form} noValidate onSubmit={(event) => void handleSubmit(event)}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('sections.personal')}</h2>
        <div className={styles.grid}>
          <TextInput
            classNames={fieldClasses}
            className={styles.fullRow}
            label={t('fields.nombre')}
            autoComplete="name"
            required
            {...form.getInputProps('nombre')}
          />
          <TextInput
            classNames={fieldClasses}
            label={t('fields.telefono')}
            type="tel"
            autoComplete="tel"
            required
            {...form.getInputProps('telefono')}
          />
          <TextInput
            classNames={fieldClasses}
            label={t('fields.email')}
            type="email"
            autoComplete="email"
            required
            {...form.getInputProps('email')}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('sections.property')}</h2>
        <div className={styles.grid}>
          <NativeSelect
            classNames={fieldClasses}
            className={styles.fullRow}
            label={t('fields.tipo')}
            required
            data={[
              selectPlaceholder,
              ...TIPOS_INMUEBLE.map((tipo) => ({ value: tipo, label: tipoLabel(tipo) })),
            ]}
            {...form.getInputProps('tipo')}
          />
          <NativeSelect
            classNames={fieldClasses}
            label={t('fields.departamento')}
            required
            data={[
              selectPlaceholder,
              ...DEPARTAMENTOS.map((departamento) => ({
                value: departamento,
                label: departamento,
              })),
            ]}
            {...form.getInputProps('departamento')}
            onChange={(event) => {
              form.setFieldValue('departamento', event.currentTarget.value);
              form.setFieldValue('municipio', '');
            }}
          />
          <NativeSelect
            classNames={fieldClasses}
            label={t('fields.municipio')}
            required
            disabled={municipios.length === 0}
            data={[
              municipios.length === 0
                ? { value: '', label: t('placeholders.municipioFirst') }
                : selectPlaceholder,
              ...municipios.map((municipio) => ({ value: municipio, label: municipio })),
            ]}
            {...form.getInputProps('municipio')}
          />
          <TextInput
            classNames={fieldClasses}
            label={t('fields.valor')}
            inputMode="numeric"
            {...form.getInputProps('valor')}
          />
          <TextInput
            classNames={fieldClasses}
            label={t('fields.areaConstruida')}
            inputMode="decimal"
            {...form.getInputProps('areaConstruida')}
          />
          <TextInput
            classNames={fieldClasses}
            label={t('fields.areaLote')}
            inputMode="decimal"
            {...form.getInputProps('areaLote')}
          />
          <Textarea
            classNames={fieldClasses}
            className={styles.fullRow}
            label={t('fields.mensaje')}
            rows={4}
            {...form.getInputProps('mensaje')}
          />
        </div>
      </section>

      <Checkbox
        classNames={{
          root: styles.consent,
          label: styles.consentLabel,
          inner: styles.consentBox,
          description: styles.consentDescription,
          error: styles.error,
        }}
        label={t('consent.label')}
        description={
          <a href={dataPolicyHref} target="_blank" rel="noopener noreferrer">
            {t('consent.policy')}
          </a>
        }
        required
        {...form.getInputProps('consent', { type: 'checkbox' })}
      />

      {/* AC3.4.1: honeypot. Invisible para personas, sin etiqueta ni foco; los bots lo rellenan. */}
      <input
        type="text"
        name="sitio"
        className={styles.honeypot}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={form.values.sitio}
        onChange={(event) => form.setFieldValue('sitio', event.currentTarget.value)}
      />

      {notice !== null && (
        <div className={styles.notice} role="alert">
          {notice === 'emailFailed' ? (
            <>
              <p className={styles.noticeTitle}>{t('fallback.title')}</p>
              <p className={styles.noticeBody}>{t('fallback.body')}</p>
              {fallbackUrl !== null && (
                <a
                  className={styles.whatsapp}
                  href={fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('fallback.button')}
                </a>
              )}
            </>
          ) : (
            <p className={styles.noticeBody}>{noticeText(notice)}</p>
          )}
        </div>
      )}

      <button type="submit" className={styles.submit} disabled={pending} aria-busy={pending}>
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
