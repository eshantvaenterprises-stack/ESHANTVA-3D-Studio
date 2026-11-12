import { SiteHeader } from '../layout/SiteHeader';
import { HeroSection } from '../home/HeroSection';
import { TrustStrip } from '../home/TrustStrip';
import { CustomerPaths } from '../home/CustomerPaths';
import { CapabilityJourney } from '../home/CapabilityJourney';
import { FeaturedProducts } from '../home/FeaturedProducts';
import { CustomOrderFeature } from '../home/CustomOrderFeature';
import { HowItWorks } from '../home/HowItWorks';
import { MaterialsPreview } from '../home/MaterialsPreview';
import { VerificationFeature } from '../home/VerificationFeature';
import { LocalServiceSection } from '../home/LocalServiceSection';
import { StudioWorkPreview } from '../home/StudioWorkPreview';
import { FaqPreview } from '../home/FaqPreview';
import { FinalCTA } from '../home/FinalCTA';
import { Footer } from '../layout/Footer';
import { retailVisibility } from '@/config/retailVisibility';

export function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <TrustStrip />
        <CustomerPaths />
        <CapabilityJourney />
        {retailVisibility.isInternal && <FeaturedProducts />}
        <CustomOrderFeature />
        <HowItWorks />
        <MaterialsPreview />
        <VerificationFeature />
        <LocalServiceSection />
        <StudioWorkPreview />
        <FaqPreview />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
