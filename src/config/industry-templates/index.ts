export type {
  IndustryTemplate,
  TemplateAreaColor,
  TemplateArea,
  TemplateProject,
  TemplateTask,
  TemplateFocusSession,
  TemplateQuickNote,
  TemplateHabit,
  TemplateNetworkContact,
  TemplateRecurringResponsibility,
} from "./types";

export { cleanSlateTemplate } from "./clean-slate";
export { startupTemplate } from "./startup";
export { personalLifeTemplate } from "./personal-life";
export { financeTemplate } from "./finance";
export { mediaTemplate } from "./media";
export { marketingTemplate } from "./marketing";
export { educationTemplate } from "./education";
export { legalTemplate } from "./legal";
export { realEstateTemplate } from "./real-estate";
export { gastroTemplate } from "./gastro";
export { retailTemplate } from "./retail";
export { creativeTemplate } from "./creative";
export { eventsTemplate } from "./events";
export { healthTemplate } from "./health";

import { cleanSlateTemplate } from "./clean-slate";
import { startupTemplate } from "./startup";
import { personalLifeTemplate } from "./personal-life";
import { financeTemplate } from "./finance";
import { mediaTemplate } from "./media";
import { marketingTemplate } from "./marketing";
import { educationTemplate } from "./education";
import { legalTemplate } from "./legal";
import { realEstateTemplate } from "./real-estate";
import { gastroTemplate } from "./gastro";
import { retailTemplate } from "./retail";
import { creativeTemplate } from "./creative";
import { eventsTemplate } from "./events";
import { healthTemplate } from "./health";
import type { IndustryTemplate } from "./types";

/** Registry of all selectable onboarding templates, keyed by IndustryTemplate.id. */
export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
  [cleanSlateTemplate.id]: cleanSlateTemplate,
  [startupTemplate.id]: startupTemplate,
  [personalLifeTemplate.id]: personalLifeTemplate,
  [financeTemplate.id]: financeTemplate,
  [mediaTemplate.id]: mediaTemplate,
  [marketingTemplate.id]: marketingTemplate,
  [educationTemplate.id]: educationTemplate,
  [legalTemplate.id]: legalTemplate,
  [realEstateTemplate.id]: realEstateTemplate,
  [gastroTemplate.id]: gastroTemplate,
  [retailTemplate.id]: retailTemplate,
  [creativeTemplate.id]: creativeTemplate,
  [eventsTemplate.id]: eventsTemplate,
  [healthTemplate.id]: healthTemplate,
};
