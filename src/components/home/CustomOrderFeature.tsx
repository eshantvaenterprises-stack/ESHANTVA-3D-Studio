import { ArrowRight, FileBox, FileImage, FileText, UploadCloud } from 'lucide-react';
import { Button } from '../ui/Button';

const files = [
  { icon: FileBox, name: 'part-design.stl', type: '3D FILE · UI EXAMPLE' },
  { icon: FileImage, name: 'reference-image.png', type: 'IMAGE · UI EXAMPLE' },
  { icon: FileText, name: 'dimensions.pdf', type: 'DRAWING · UI EXAMPLE' },
];

export function CustomOrderFeature() {
  return (
    <section className="custom-order-section">
      <div className="custom-order-grid shell">
        <div className="custom-order-copy">
          <span className="section-kicker">CUSTOM ORDER / REVIEW-BASED</span>
          <h2>Already have a file,<br />drawing or idea?</h2>
          <p>Submit your requirement with files, dimensions or references. ESHANTVA reviews the request before confirming production and pricing.</p>
          <div className="custom-actions">
            <Button to="/custom-order">Start Custom Order <ArrowRight size={17} /></Button>
            <Button to="/how-it-works" variant="ghost">How Custom Orders Work</Button>
          </div>
          <div className="accepted-inputs"><span>3D Files</span><span>Drawings</span><span>Dimensions</span><span>Images / References</span></div>
        </div>
        <div className="upload-mockup" aria-label="Example file request interface">
          <div className="mockup-head"><span>NEW REQUEST</span><small>UI PREVIEW / NOT A LIVE FORM</small></div>
          <div className="drop-zone"><UploadCloud size={31} /><strong>Attach your requirement</strong><span>File upload will be available on the Custom Order page</span></div>
          <div className="file-list">
            {files.map(({ icon: Icon, name, type }) => (
              <div key={name}><Icon size={21} /><span><strong>{name}</strong><small>{type}</small></span><em>EXAMPLE</em></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
