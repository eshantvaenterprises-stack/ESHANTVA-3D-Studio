'use client';

import { writeSessionConfirmation } from '@/lib/requestConfirmation';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, type FieldPath } from 'react-hook-form';
import {
  ArrowLeft, ArrowRight, Box, Check, ClipboardList, FileImage, FilePenLine,
  FileUp, PackageOpen, PencilRuler, ShieldCheck, Wrench,
} from 'lucide-react';
import { customOrderConfig, customOrderDefaults, requestTypeOptions } from '@/config/customOrder';
import { clearSafeDraft, readSafeDraft, writeSafeDraft, type SafeCustomOrderDraft } from '@/lib/customOrderDraft';
import {
  createServerDraft, customOrderBackendConfigured, removeCustomOrderFile,
  submitCustomRequest, uploadCustomOrderFile,
} from '@/lib/customOrderApi';
import { customOrderSubmissionSchema } from '@/lib/customOrderValidation';
import { createLocalId } from '@/lib/localId';
import type { CustomOrderFile, CustomOrderFormValues } from '@/types/customOrder';
import { FileUploadField } from './FileUploadField';

const steps = ['Request', 'Details', 'Files', 'Specifications', 'Delivery', 'Options', 'Contact', 'Review'] as const;
const typeIcons = [FileUp, PencilRuler, FileImage, FilePenLine, Box, Wrench, PackageOpen];
const needsFile = new Set(['3d_file', 'drawing_dimensions', 'image_reference']);

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function normalizeSourceProduct(value: string | null) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 120) || '';
}

export function CustomOrderWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceProductFromQuery = normalizeSourceProduct(searchParams.get('sourceProduct'));
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<CustomOrderFile[]>([]);
  const [fileMessage, setFileMessage] = useState('');
  const [draftOffer, setDraftOffer] = useState<SafeCustomOrderDraft | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef<string | null>(null);
  const draftPromiseRef = useRef<Promise<string> | null>(null);
  const initializedRef = useRef(false);

  const {
    register, watch, setValue, getValues, trigger, reset, formState: { errors, isDirty },
  } = useForm<CustomOrderFormValues>({ defaultValues: { ...customOrderDefaults, sourceProductSlug: sourceProductFromQuery }, mode: 'onBlur' });
  const values = watch();
  const functional = values.requestType === 'replacement_part';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sourceProductSlug = sourceProductFromQuery;
    if (sourceProductSlug) setValue('sourceProductSlug', sourceProductSlug);
    const saved = readSafeDraft();
    if (saved) setDraftOffer(saved);
    const requestedStep = Number(params.get('step'));
    if (Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= steps.length) setStep(requestedStep - 1);
    initializedRef.current = true;
  }, [setValue, sourceProductFromQuery]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (!isDirty && step === 0 && !values.requestType && !values.sourceProductSlug) return;
    const timer = window.setTimeout(() => writeSafeDraft(getValues(), step), 450);
    return () => window.clearTimeout(timer);
  }, [values.requestType, values.quantity, values.deliveryMethod, values.dimensionUnit, values.material, values.colorPreference, values.verificationRequested, values.language, values.sourceProductSlug, step, getValues, isDirty]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!isDirty && files.length === 0) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [files.length, isDirty]);

  useEffect(() => {
    const onBack = () => {
      const requested = Number(new URLSearchParams(location.search).get('step'));
      if (Number.isInteger(requested) && requested >= 1 && requested <= steps.length) setStep(requested - 1);
      else setStep(0);
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

  const goToStep = useCallback((next: number, replace = false) => {
    const bounded = Math.max(0, Math.min(steps.length - 1, next));
    setStep(bounded);
    const params = new URLSearchParams(location.search);
    if (bounded === 0) params.delete('step'); else params.set('step', String(bounded + 1));
    const url = `${location.pathname}${params.size ? `?${params}` : ''}`;
    history[replace ? 'replaceState' : 'pushState']({ customOrderStep: bounded }, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  function continueDraft() {
    if (!draftOffer) return;
    for (const [key, value] of Object.entries(draftOffer)) {
      if (key === 'step' || key === 'savedAt') continue;
      setValue(key as FieldPath<CustomOrderFormValues>, value as never, { shouldDirty: true });
    }
    setDraftOffer(null);
    goToStep(Math.min(draftOffer.step, steps.length - 1), true);
  }

  function startOver() {
    clearSafeDraft();
    setDraftOffer(null);
    setFiles([]);
    requestIdRef.current = null;
    reset({ ...customOrderDefaults, sourceProductSlug: values.sourceProductSlug });
    goToStep(0, true);
  }

  async function ensureServerDraft() {
    if (requestIdRef.current) return requestIdRef.current;
    if (!draftPromiseRef.current) {
      draftPromiseRef.current = createServerDraft(getValues('sourceProductSlug')).then(({ requestId }) => {
        requestIdRef.current = requestId;
        return requestId;
      }).finally(() => { draftPromiseRef.current = null; });
    }
    return draftPromiseRef.current;
  }

  async function uploadOne(localId: string, file: File) {
    setFiles((current) => current.map((item) => item.localId === localId ? { ...item, state: 'preparing', progress: 0, error: undefined } : item));
    try {
      const requestId = await ensureServerDraft();
      const serverFileId = await uploadCustomOrderFile(requestId, file, (progress) => {
        setFiles((current) => current.map((item) => item.localId === localId ? { ...item, state: 'uploading', progress } : item));
      });
      setFiles((current) => current.map((item) => item.localId === localId ? { ...item, state: 'ready', progress: 100, serverFileId } : item));
    } catch (error) {
      setFiles((current) => current.map((item) => item.localId === localId ? { ...item, state: 'error', error: errorText(error) } : item));
    }
  }

  function validateCandidateFiles(incoming: File[], currentItems = files) {
    const remainingSlots = customOrderConfig.limits.maxFiles - currentItems.length;
    if (incoming.length > remainingSlots) return `You can add ${Math.max(0, remainingSlots)} more file${remainingSlots === 1 ? '' : 's'}.`;
    const existingBytes = currentItems.reduce((total, item) => total + item.file.size, 0);
    let incomingBytes = 0;
    for (const file of incoming) {
      const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
      if (!customOrderConfig.acceptedExtensions.includes(extension as never)) return `${file.name}: this file extension is not accepted.`;
      if (file.size > customOrderConfig.limits.maxFileBytes) return `${file.name}: file is larger than 50 MB.`;
      incomingBytes += file.size;
    }
    if (existingBytes + incomingBytes > customOrderConfig.limits.maxTotalBytes) return 'Combined file size cannot exceed 150 MB.';
    return '';
  }

  function addFiles(incoming: File[]) {
    setFileMessage('');
    const problem = validateCandidateFiles(incoming);
    if (problem) { setFileMessage(problem); return; }
    const additions = incoming.map((file) => ({
      localId: createLocalId('custom-file'), file, state: 'selected' as const, progress: 0,
    }));
    setFiles((current) => [...current, ...additions]);
    if (customOrderBackendConfigured) for (const item of additions) void uploadOne(item.localId, item.file);
  }

  async function removeFile(localId: string) {
    const selected = files.find((item) => item.localId === localId);
    setFiles((current) => current.filter((item) => item.localId !== localId));
    if (selected?.serverFileId && requestIdRef.current && customOrderBackendConfigured) {
      try { await removeCustomOrderFile(requestIdRef.current, selected.serverFileId); }
      catch { setFileMessage('The file was removed from this form, but secure storage cleanup should be retried before submission.'); }
    }
  }

  async function replaceFile(localId: string, file: File) {
    setFileMessage('');
    const target = files.find((item) => item.localId === localId);
    const remaining = files.filter((item) => item.localId !== localId);
    const problem = validateCandidateFiles([file], remaining);
    if (problem) { setFileMessage(problem); return; }
    const addition: CustomOrderFile = { localId: createLocalId('custom-file'), file, state: 'selected', progress: 0 };
    setFiles([...remaining, addition]);
    if (target?.serverFileId && requestIdRef.current && customOrderBackendConfigured) {
      try { await removeCustomOrderFile(requestIdRef.current, target.serverFileId); }
      catch { setFileMessage('The replacement is selected, but cleanup of the earlier secure object should be retried.'); }
    }
    if (customOrderBackendConfigured) void uploadOne(addition.localId, addition.file);
  }

  async function validateStep() {
    setSubmitError('');
    if (step === 0) return trigger('requestType');
    if (step === 1) {
      const fields: FieldPath<CustomOrderFormValues>[] = ['title', 'description', 'intendedUse'];
      if (functional) fields.push('functionalPurpose', 'usedWhere', 'exactDimensions');
      return trigger(fields);
    }
    if (step === 2) {
      if (needsFile.has(values.requestType) && files.length === 0) { setFileMessage('Add at least one supporting file for this request path.'); return false; }
      if (customOrderBackendConfigured && files.some((item) => item.state !== 'ready')) { setFileMessage('Wait for every secure upload to finish, or remove files with errors.'); return false; }
      return true;
    }
    if (step === 3) return trigger(['length', 'width', 'height', 'colorDetails']);
    if (step === 4) {
      const fields: FieldPath<CustomOrderFormValues>[] = ['quantity', 'deliveryMethod'];
      if (values.deliveryMethod !== 'local_pickup') fields.push('pinCode', 'city', 'state');
      return trigger(fields);
    }
    if (step === 5) return trigger('notes');
    if (step === 6) return trigger(['customerName', 'customerEmail', 'customerPhone', 'communicationMethod', 'policyConsent', 'accuracyConsent']);
    return true;
  }

  async function next() {
    if (await validateStep()) goToStep(step + 1);
  }

  async function submit() {
    setSubmitError('');
    if (!customOrderBackendConfigured) { setSubmitError('Secure submission is temporarily unavailable. No request has been sent. Please try again later or use the Contact page.'); return; }
    if (files.some((item) => item.state !== 'ready')) { setSubmitError('Every attached file must finish its secure upload before submission.'); return; }
    const submission = { ...getValues(), fileIds: files.flatMap((file) => file.serverFileId ? [file.serverFileId] : []) };
    const parsed = customOrderSubmissionSchema.safeParse(submission);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setSubmitError(first?.message || 'Review the highlighted details before submitting.');
      const field = first?.path[0];
      const contactFields = new Set(['customerName', 'customerEmail', 'customerPhone', 'policyConsent', 'accuracyConsent']);
      if (contactFields.has(String(field))) goToStep(6);
      return;
    }
    setSubmitting(true);
    try {
      const confirmation = await submitCustomRequest(requestIdRef.current, parsed.data);
      writeSessionConfirmation('eshantva-custom-order-confirmation', confirmation);
      clearSafeDraft();
      router.push('/custom-order/success');
    } catch (error) { setSubmitError(errorText(error)); }
    finally { setSubmitting(false); }
  }

  const selectedType = requestTypeOptions.find((option) => option.value === values.requestType);
  const totalBytes = useMemo(() => files.reduce((total, item) => total + item.file.size, 0), [files]);

  return (
    <div className="co-layout shell">
      {draftOffer && <div className="co-draft-banner" role="dialog" aria-labelledby="draft-title">
        <div><strong id="draft-title">Continue a saved form draft?</strong><span>Only non-sensitive choices were saved on this device. Contact details, descriptions and files were not stored.</span></div>
        <div><button type="button" className="button button-primary" onClick={continueDraft}>Continue draft</button><button type="button" className="button button-secondary" onClick={startOver}>Start over</button></div>
      </div>}

      <aside className="co-stepper" aria-label="Custom request progress">
        <div className="co-mobile-progress"><span>Step {step + 1} of {steps.length}</span><strong>{steps[step]}</strong><div><i style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div></div>
        <ol>{steps.map((label, index) => <li key={label} className={index === step ? 'is-current' : index < step ? 'is-complete' : ''}>
          <button type="button" onClick={() => index < step && goToStep(index)} disabled={index > step} aria-current={index === step ? 'step' : undefined}>
            <span>{index < step ? <Check size={14} /> : String(index + 1).padStart(2, '0')}</span><em>{label}</em>
          </button>
        </li>)}</ol>
        <div className="co-assurance"><ShieldCheck size={19} /><span><strong>Review-based process</strong>Submitting a request does not confirm feasibility, pricing or production.</span></div>
      </aside>

      <section className="co-form-card">
        <input type="hidden" {...register('sourceProductSlug')} />
        <header className="co-step-heading"><span>{String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</span><h2>{stepHeading(step)}</h2><p>{stepDescription(step)}</p></header>

        {step === 0 && <div className="co-request-types">
          {requestTypeOptions.map((option, index) => {
            const Icon = typeIcons[index];
            return <label key={option.value} className={values.requestType === option.value ? 'is-selected' : ''}>
              <input type="radio" value={option.value} {...register('requestType', { required: 'Choose the starting point that best matches your request.' })} />
              <Icon size={24} strokeWidth={1.5} /><span><strong>{option.label}</strong><small>{option.description}</small></span><i>{values.requestType === option.value && <Check size={13} />}</i>
            </label>;
          })}
          {errors.requestType && <p className="co-error" role="alert">{errors.requestType.message}</p>}
          {values.sourceProductSlug && <div className="co-source-product"><ClipboardList size={18} /><span><strong>Started from a product</strong>Product reference: {values.sourceProductSlug}</span></div>}
        </div>}

        {step === 1 && <div className="co-fields">
          <Field label="Request title" required error={errors.title?.message}><input {...register('title', { required: 'Add a short request title.', minLength: { value: 3, message: 'Use at least 3 characters.' }, maxLength: 120 })} placeholder="Example: Replacement knob for a control panel" /></Field>
          <Field label="Describe what you need" required hint={`${values.description.length}/3000`} error={errors.description?.message}><textarea rows={6} {...register('description', { required: 'Describe the item or outcome you need.', minLength: { value: 20, message: 'Please add a little more detail (at least 20 characters).' }, maxLength: 3000 })} placeholder="Include the shape, fit, finish and any important constraints." /></Field>
          <Field label="What will it be used for?" required error={errors.intendedUse?.message}><textarea rows={3} {...register('intendedUse', { required: 'Tell us the intended use.', minLength: { value: 3, message: 'Add the intended use.' }, maxLength: 1000 })} /></Field>
          {functional && <div className="co-conditional-section"><div className="co-review-notice"><strong>Manual review required</strong><span>Functional and replacement parts need fit, load and safety review. Submission does not certify the part for a safety-critical use.</span></div>
            <div className="co-two-cols">
              <Field label="What must the part do?" required error={errors.functionalPurpose?.message}><textarea rows={3} {...register('functionalPurpose', { required: 'Describe what the part must do.', maxLength: 1000 })} /></Field>
              <Field label="Where is it used?" required error={errors.usedWhere?.message}><textarea rows={3} {...register('usedWhere', { required: 'Describe where the part is used.', maxLength: 1000 })} /></Field>
            </div>
            <Field label="Load or movement conditions" error={errors.loadConditions?.message}><textarea rows={3} {...register('loadConditions', { maxLength: 1000 })} placeholder="Static load, repeated movement, vibration or unknown" /></Field>
            <div className="co-check-grid"><CheckField label="Exposed to heat" registration={register('heatExposure')} /><CheckField label="Used outdoors" registration={register('outdoorUse')} /><CheckField label="Touches water or chemicals" registration={register('waterChemicalExposure')} /><CheckField label="Original part is available" registration={register('originalPartAvailable')} /></div>
            <Field label="Known exact dimensions" required error={errors.exactDimensions?.message}><textarea rows={3} {...register('exactDimensions', { required: 'Provide known dimensions or explain what is unknown.', maxLength: 1000 })} placeholder="Include tolerances if known." /></Field>
            <Field label="Safety notes" error={errors.safetyNotes?.message}><textarea rows={3} {...register('safetyNotes', { maxLength: 1500 })} placeholder="Mention consequences of failure or any safety concern." /></Field>
          </div>}
        </div>}

        {step === 2 && <div><FileUploadField items={files} backendConfigured={customOrderBackendConfigured} onAdd={addFiles} onRemove={(id) => void removeFile(id)} onReplace={(id, file) => void replaceFile(id, file)} onRetry={(id) => { const item = files.find((candidate) => candidate.localId === id); if (item) void uploadOne(id, item.file); }} />
          {fileMessage && <p className="co-error" role="alert">{fileMessage}</p>}
          <div className="co-file-summary"><span>{files.length} / {customOrderConfig.limits.maxFiles} files</span><span>{(totalBytes / (1024 * 1024)).toFixed(1)} / 150 MB</span></div>
          <div className="co-privacy-note"><ShieldCheck size={18} /><p><strong>Private by design.</strong> Production files use authenticated private storage. Original filenames are metadata only; storage paths are generated by the server. No public file URL is displayed.</p></div>
        </div>}

        {step === 3 && <div className="co-fields">
          <fieldset className="co-fieldset"><legend>Approximate overall size <span>Optional</span></legend><div className="co-dimensions">
            {(['length', 'width', 'height'] as const).map((field) => <label key={field}><span>{field[0].toUpperCase() + field.slice(1)}</span><input type="number" min="0" step="any" inputMode="decimal" {...register(field, { setValueAs: (value) => value === '' || value === null || value === undefined ? null : Number(value), min: { value: 0.001, message: 'Use a positive value.' }, max: { value: 1000000, message: 'Value is too large.' } })} /></label>)}
            <label><span>Unit</span><select {...register('dimensionUnit')}><option value="mm">mm</option><option value="cm">cm</option><option value="in">inches</option></select></label>
          </div><small>Measurements are stored internally in millimetres while preserving the unit you entered.</small></fieldset>
          <div className="co-two-cols">
            <Field label="Material preference"><select {...register('material')}><option value="not_sure">Not sure — please recommend</option><option value="pla">PLA</option><option value="petg">PETG</option><option value="tpu">TPU / flexible</option><option value="abs">ABS</option><option value="resin">Resin</option></select></Field>
            <Field label="Colour preference"><select {...register('colorPreference')}><option value="no_preference">No preference</option><option value="specific">I have a specific colour in mind</option></select></Field>
          </div>
          {values.colorPreference === 'specific' && <Field label="Preferred colour" required error={errors.colorDetails?.message}><input {...register('colorDetails', { required: 'Describe the preferred colour.', maxLength: 200 })} placeholder="Colour name, shade or reference" /></Field>}
          <div className="co-two-cols"><Field label="Personalisation type"><input {...register('personalizationType', { maxLength: 120 })} placeholder="Name, logo, label or other" /></Field><Field label="Personalisation text"><input {...register('personalizationText', { maxLength: 500 })} placeholder="Exact spelling if applicable" /></Field></div>
          <p className="co-inline-disclaimer">Material, colour, tolerances and finish remain subject to design review and available production options. Exact colour matching is not guaranteed before review.</p>
        </div>}

        {step === 4 && <div className="co-fields">
          <div className="co-two-cols"><Field label="Quantity" required error={errors.quantity?.message}><input type="number" min="1" max="100000" inputMode="numeric" {...register('quantity', { valueAsNumber: true, required: 'Enter a quantity.', min: { value: 1, message: 'Quantity must be at least 1.' }, max: { value: 100000, message: 'Please request a manual quantity review.' } })} /></Field><Field label="Target date" hint="Optional — not guaranteed"><input type="date" min={new Date().toISOString().slice(0, 10)} {...register('targetDate')} /></Field></div>
          {values.quantity >= customOrderConfig.limits.bulkQuantityThreshold && <div className="co-review-notice"><strong>Bulk quantity detected</strong><span>No automatic discount is promised. ESHANTVA will review production and quotation terms individually.</span></div>}
          <fieldset className="co-fieldset"><legend>Delivery preference</legend><div className="co-delivery-options">
            {customOrderConfig.features.panIndiaShippingEnabled && <RadioCard value="shipping" current={values.deliveryMethod} label="Pan-India shipping" copy="Shipping charges are additional and confirmed after review." registration={register('deliveryMethod')} />}
            {customOrderConfig.features.localPickupEnabled && <RadioCard value="local_pickup" current={values.deliveryMethod} label="Local pickup" copy="Biswanath area, by confirmed arrangement. No pickup charge." registration={register('deliveryMethod')} />}
            {customOrderConfig.features.localDeliveryEnabled && <RadioCard value="local_delivery" current={values.deliveryMethod} label="Local delivery" copy="Availability and any location-based charge are confirmed after review." registration={register('deliveryMethod')} />}
          </div></fieldset>
          {values.deliveryMethod !== 'local_pickup' && <div className="co-three-cols"><Field label="PIN code" required error={errors.pinCode?.message}><input inputMode="numeric" maxLength={6} {...register('pinCode', { required: 'Enter the delivery PIN code.', pattern: { value: /^[1-9][0-9]{5}$/, message: 'Enter a valid 6-digit Indian PIN code.' } })} /></Field><Field label="City" required error={errors.city?.message}><input {...register('city', { required: 'Enter the city.', maxLength: 100 })} /></Field><Field label="State" required error={errors.state?.message}><input {...register('state', { required: 'Enter the state.', maxLength: 100 })} /></Field></div>}
        </div>}

        {step === 5 && <div className="co-fields">
          {customOrderConfig.features.verificationServiceEnabled && <label className="co-option-panel"><input type="checkbox" {...register('verificationRequested')} /><span><strong>Request finished-product photo/video verification</strong><small>This is separate from a 3D model viewer. Availability and any additional order-specific charge will be confirmed after review.</small></span></label>}
          <Field label="Additional notes" hint={`${values.notes.length}/${customOrderConfig.limits.maxNotesLength}`} error={errors.notes?.message}><textarea rows={7} {...register('notes', { maxLength: { value: customOrderConfig.limits.maxNotesLength, message: `Keep notes within ${customOrderConfig.limits.maxNotesLength} characters.` } })} placeholder="Add any other detail that may help the review." /></Field>
          <div className="co-policy-grid"><article><strong>Pricing</strong><p>Pricing will be confirmed after review. No price is created by this form.</p></article><article><strong>Payment</strong><p>Accepted standard and lower-value orders require full payment. High-value terms may be agreed individually. No COD.</p></article><article><strong>Changes</strong><p>Changes after work begins may add cost; changes after manufacturing may require reprinting.</p></article></div>
        </div>}

        {step === 6 && <div className="co-fields">
          <div className="co-two-cols"><Field label="Your name" required error={errors.customerName?.message}><input autoComplete="name" {...register('customerName', { required: 'Enter your name.', minLength: { value: 2, message: 'Enter at least 2 characters.' }, maxLength: 120 })} /></Field><Field label="Email" required error={errors.customerEmail?.message}><input type="email" autoComplete="email" {...register('customerEmail', { required: 'Enter your email.', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address.' }, maxLength: 254 })} /></Field></div>
          <Field label="Phone number" hint="Optional unless phone is selected" error={errors.customerPhone?.message}><input type="tel" autoComplete="tel" {...register('customerPhone', { pattern: { value: /^[+0-9 ()-]{7,20}$/, message: 'Enter a valid phone number.' } })} /></Field>
          <div className="co-two-cols"><Field label="Preferred communication"><select {...register('communicationMethod')}><option value="email">Email</option><option value="phone">Phone</option></select></Field><Field label="Preferred language"><select {...register('language')}><option value="english">English</option><option value="hindi">Hindi</option><option value="assamese">Assamese</option></select></Field></div>
          <input className="co-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" {...register('website')} />
          <div className="co-consents">
            <label><input type="checkbox" {...register('policyConsent', { required: 'Accept the custom order and file/IP policies to continue.' })} /><span>I have the right to share these files and agree to the <a href="/custom-order-policy" target="_blank">Custom Order Policy</a> and <a href="/file-ip-policy" target="_blank">File &amp; IP Policy</a>.</span></label>
            {errors.policyConsent && <p className="co-error">{errors.policyConsent.message}</p>}
            <label><input type="checkbox" {...register('accuracyConsent', { required: 'Confirm that you reviewed your files and dimensions.' })} /><span>I reviewed the supplied files, dimensions and spelling. I understand feasibility, pricing and acceptance are confirmed only after review.</span></label>
            {errors.accuracyConsent && <p className="co-error">{errors.accuracyConsent.message}</p>}
          </div>
          <p className="co-inline-disclaimer">ESHANTVA may decline requests that are unsafe, unlawful, infringing or outside available capability. Cancellation and change eligibility depend on the stage of work.</p>
        </div>}

        {step === 7 && <Review values={values} files={files} selectedType={selectedType?.label || 'Not selected'} edit={goToStep} />}

        {submitError && <div className="co-submit-error" role="alert"><strong>Request not submitted</strong><span>{submitError}</span></div>}
        <footer className="co-form-actions">
          {step > 0 ? <button type="button" className="button button-secondary" onClick={() => goToStep(step - 1)}><ArrowLeft size={16} /> Back</button> : <span />}
          {step < steps.length - 1 ? <button type="button" className="button button-primary" onClick={() => void next()}>Continue <ArrowRight size={16} /></button> : <button type="button" className="button button-primary" disabled={submitting} onClick={() => void submit()}>{submitting ? 'Submitting securely…' : 'Submit Custom Request'} <ArrowRight size={16} /></button>}
        </footer>
      </section>
    </div>
  );
}

function stepHeading(step: number) {
  return ['Choose your starting point', 'Describe the request', 'Attach supporting files', 'Add specifications', 'Quantity and delivery', 'Optional services and notes', 'How can we reach you?', 'Review before submitting'][step];
}

function stepDescription(step: number) {
  return ['Pick the option that best matches what you already have.', 'Clear context helps the studio assess feasibility.', 'Files stay private and are reviewed only for this request.', 'Share what you know; “not sure” is a valid choice.', 'No delivery charge or date is invented at this stage.', 'Select only what is useful for your request.', 'Contact details are used to review and respond to this request.', 'Check every section. Submission creates a request for review—not an order.'][step];
}

function Field({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return <label className="co-field"><span><strong>{label}{required && <em>Required</em>}</strong>{hint && <small>{hint}</small>}</span>{children}{error && <i className="co-error">{error}</i>}</label>;
}

function CheckField({ label, registration }: { label: string; registration: ReturnType<ReturnType<typeof useForm<CustomOrderFormValues>>['register']> }) {
  return <label><input type="checkbox" {...registration} /><span>{label}</span></label>;
}

function RadioCard({ value, current, label, copy, registration }: { value: string; current: string; label: string; copy: string; registration: ReturnType<ReturnType<typeof useForm<CustomOrderFormValues>>['register']> }) {
  return <label className={current === value ? 'is-selected' : ''}><input type="radio" value={value} {...registration} /><span><strong>{label}</strong><small>{copy}</small></span><i>{current === value && <Check size={13} />}</i></label>;
}

function Review({ values, files, selectedType, edit }: { values: CustomOrderFormValues; files: CustomOrderFile[]; selectedType: string; edit: (step: number) => void }) {
  const rows = [
    { step: 0, title: 'Request', body: `${selectedType}${values.sourceProductSlug ? ` · From ${values.sourceProductSlug}` : ''}` },
    { step: 1, title: 'Details', body: `${values.title} — ${values.description}` },
    { step: 2, title: 'Files', body: files.length ? files.map((file) => `${file.file.name} (${file.state === 'ready' ? 'secure upload ready' : 'selected'})`).join(', ') : 'No files attached' },
    { step: 3, title: 'Specifications', body: `${[values.length, values.width, values.height].some((value) => typeof value === 'number' && value > 0) ? `${values.length || '—'} × ${values.width || '—'} × ${values.height || '—'} ${values.dimensionUnit}` : 'Dimensions not supplied'} · Material: ${values.material.replace('_', ' ')} · Colour: ${values.colorPreference === 'specific' ? values.colorDetails : 'No preference'}` },
    { step: 4, title: 'Delivery', body: `Quantity ${values.quantity} · ${values.deliveryMethod.replaceAll('_', ' ')}${values.targetDate ? ` · Target ${values.targetDate} (not guaranteed)` : ''}` },
    { step: 5, title: 'Options', body: `${values.verificationRequested ? 'Photo/video verification requested (charge may apply)' : 'No finished-product verification requested'}${values.notes ? ` · ${values.notes}` : ''}` },
    { step: 6, title: 'Contact', body: `${values.customerName} · ${values.customerEmail}${values.customerPhone ? ` · ${values.customerPhone}` : ''} · ${values.language}` },
  ];
  return <div className="co-review"><div className="co-price-review"><span>Pricing</span><strong>Pricing will be confirmed after review</strong><small>No payment is taken when submitting this request.</small></div>{rows.map((row) => <article key={row.title}><div><span>{row.title}</span><p>{row.body}</p></div><button type="button" onClick={() => edit(row.step)}>Edit</button></article>)}<div className="co-review-notice"><strong>Before you submit</strong><span>This creates a custom request with status “Submitted”. It does not confirm an order, price, target date or production acceptance.</span></div></div>;
}
