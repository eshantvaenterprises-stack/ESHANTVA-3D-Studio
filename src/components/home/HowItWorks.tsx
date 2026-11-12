import { Box, CheckCircle2, PackageOpen, Send } from 'lucide-react';

const steps = [
  { index: '01', title: 'Choose or Submit', copy: 'Browse a ready product or send your requirement.', icon: Send },
  { index: '02', title: 'Review & Confirm', copy: 'Custom details, feasibility and pricing are confirmed.', icon: CheckCircle2 },
  { index: '03', title: 'Production', copy: 'Production begins only after the order is accepted.', icon: Box },
  { index: '04', title: 'Pickup or Delivery', copy: 'Collect locally by appointment or receive delivery.', icon: PackageOpen },
];

export function HowItWorks() {
  return (
    <section className="section how-section">
      <div className="section-heading shell">
        <div><span className="section-kicker">A CLEAR PROCESS</span><h2>From request to delivery.</h2></div>
        <p>Custom-order quotations happen after review—not through an instant automated price.</p>
      </div>
      <ol className="steps-grid shell">
        {steps.map(({ icon: Icon, ...step }) => (
          <li key={step.index}>
            <div><span>{step.index}</span><Icon size={24} strokeWidth={1.6} /></div>
            <h3>{step.title}</h3><p>{step.copy}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
