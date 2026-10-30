export type Locale = "en" | "id";

export const LOCALES: Locale[] = ["en", "id"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  id: "Bahasa Indonesia",
};

export type Translations = typeof en;

export const en = {
  // Common
  appName: "LOCIVA",
  tagline: "Location Intelligence & Civic Analytics",
  exploreTheMap: "Explore the map",
  seeHowItWorks: "See how it works",
  learnMore: "Learn more",
  viewTheConcept: "View the concept",
  login: "Login",
  register: "Register",
  logout: "Logout",
  peta: "Map",

  // Nav
  navProduct: "Product",
  navHowItWorks: "How it works",
  navIntelligence: "Intelligence",
  navReports: "Reports",
  navAbout: "About",

  // Hero
  heroEyebrow: "Location intelligence & civic analytics",
  heroHeadline: "Understand the area before you decide.",
  heroBody:
    "Lociva combines location data, business analysis, and community reports to help you understand what is happening around a place before making a decision.",
  heroSignalGeo: "Geospatial layers",
  heroSignalReports: "Citizen condition reports",
  heroSignalScore: "Location potential score",

  // TrustStrip
  trustEyebrow: "One area. Multiple perspectives.",
  trustSubtitle: "Multi-layer intelligence framework",
  trustDemoNote:
    "Signals shown illustrate the analytical model of LOCIVA. No figures are presented as live municipal metrics.",

  // TrustStrip signal labels
  trustSignalPopulation: "Population data",
  trustSignalPopulationNote: "Who lives, works, and moves nearby",
  trustSignalPopulationIndicator: "Density & demographics",
  trustSignalBusiness: "Business activity",
  trustSignalBusinessNote: "Existing shops, competitors & footfall",
  trustSignalBusinessIndicator: "Commercial saturation",
  trustSignalReports: "Area reports",
  trustSignalReportsNote: "Community-observed infrastructure issues",
  trustSignalReportsIndicator: "Verified ground truth",
  trustSignalAccess: "Location signals",
  trustSignalAccessNote: "Accessibility, catchment & compatibility",
  trustSignalAccessIndicator: "Predictive scoring",

  // ProblemSection
  problemEyebrow: "The problem",
  problemHeadline: "A busy place is not always the right place.",
  problemBody:
    "Foot traffic can look promising on the surface while masking steep competition, poor pedestrian accessibility, or recurring civic infrastructure disruptions. Lociva analyzes a location as a composite of signals.",
  problemSignalWeight: "Signal weight ·",

  // ProblemSection factor labels
  factorPedestrian: "Pedestrian activity",
  factorPopulation: "Population",
  factorAccessibility: "Accessibility",
  factorTargetMarket: "Target market",
  factorCompetition: "Competition",
  factorAreaCondition: "Area condition",
  factorPedestrianCheck:
    "High foot traffic may simply be commuters rushing to transit rather than prospective customers.",
  factorPopulationCheck:
    "Dense resident count only matters if purchasing power and lifestyle fit your product price point.",
  factorAccessibilityCheck:
    "Narrow sidewalks and absence of parking or drop-off points create friction for repeat visitors.",
  factorTargetMarketCheck:
    "The crowd passing by must actively seek what you sell at the hours you are open.",
  factorCompetitionCheck:
    "Saturation can quickly cannibalize margins if multiple rivals offer the exact same menu.",
  factorAreaConditionCheck:
    "Repeated flooding and damaged pavements directly disrupt customer access and delivery fleets.",

  // ProductFlow
  productEyebrow: "Core product",
  productHeadline: "From a location to a decision.",
  productBody:
    "A methodical, data-backed pathway that eliminates blind intuition when evaluating physical spaces.",

  // ProductFlow step labels
  stepChoose: "Choose a business",
  stepChooseBody:
    "Select the business category you plan to launch, from grab-and-go carts to sit-down venues.",
  stepPlace: "Place it on the map",
  stepPlaceBody:
    "Pin candidate locations and define custom walkable catchment radiuses.",
  stepAnalyze: "Analyze the area",
  stepAnalyzeBody:
    "Read access corridors, competitor clusters, and civic signals around each candidate point.",
  stepUnderstand: "Understand the score",
  stepUnderstandBody:
    "Open 'why?' to unpack what lifted or lowered your Location Potential Score.",
  stepSimulate: "Simulate another scenario",
  stepSimulateBody:
    "Test alternate street corners or business types to compare location potential side by side.",
  stepDecide: "Make a better decision",
  stepDecideBody:
    "Commit real capital with clear eyes and verifiable location ground truth.",

  // BusinessSimulation
  simEyebrow: "Business simulation",
  simHeadline: "Simulate before you invest.",
  simBody:
    "Test different business ideas and locations before committing real resources.",
  simBusiness: "Business:",
  simRadius: "Radius:",
  simCatchment: "Simulated catchment",
  simCompetitors: "competitors in",
  simScore: "Location potential score",
  simFactorBreakdown: "Factor breakdown",
  simOpenWhy: "Open why?",
  simTone_potential: "Potential",
  simTone_consideration: "Consideration",
  simTone_warning: "Needs review",
  simDemoNote:
    "Scores update interactively based on business category dynamics and catchment walkability models. Figures are simulation data, not live results.",
  simSampleData: "Sample data — illustrative example, not a live result.",

  // Factor labels (used in BusinessSimulation & ScoreBreakdown)
  factorLabels_population: "Population",
  factorLabels_pedestrian: "Pedestrian potential",
  factorLabels_accessibility: "Accessibility",
  factorLabels_targetMarket: "Target market",
  factorLabels_competition: "Competition",
  factorLabels_compatibility: "Area compatibility",

  // ScoreBreakdown
  scoreEyebrow: "Location potential score",
  scoreHeadline: "A score is useful when you know why.",
  scoreComposite: "Composite score",
  scoreWhy: "Why?",
  scoreOverallSynthesis: "Overall synthesis",
  scoreFactorBreakdown: "Factor breakdown",
  scoreSixSignals: "6 signals evaluated",
  scoreDemoNote: "Figures shown are simulation / demo data, not live city statistics.",
  scoreSampleData: "Sample data — illustrative example, not a live result.",

  // WhatIfSimulation
  whatifEyebrow: "What-if simulation",
  whatifHeadline: "What if you changed the location?",
  whatifBody:
    "Same business, different area. Compare candidate sites side by side or adjust operational parameters to see how the score recalculates.",
  whatifRecalculate: "Recalculate variables",
  whatifBusinessType: "Business type",
  whatifTargetMarket: "Target market",
  whatifOperatingHours: "Operating hours",
  whatifRadius: "Catchment radius",
  whatifDemoNote:
    "Demonstration model: altering levers dynamically updates estimated scores for all three locations simultaneously. Figures are illustrative examples, not live results.",
  whatifSampleData: "Sample data — illustrative example, not a live result.",

  // CivicReport
  civicEyebrow: "Civic intelligence",
  civicHeadline: "Understand what is happening around you.",
  civicBody:
    "Citizens pin ground realities on the map, upload photos, and let neighbors verify what they see. These reports feed area-condition signals directly into the platform rather than sitting in a siloed complaint box.",
  civicReportIssue: "Report area issue",
  civicReportLifecycle: "Report lifecycle",
  civicStatus: "Status:",
  civicConfirm: "Confirm this is still happening",
  civicConfirmed: "You and {count} neighbors confirmed this",
  civicDemoNote:
    "Civic reports act as ground signals. Neighbors verify conditions to keep data fresh and actionable.",
  civicSubmitTitle: "Report field condition / issue",
  civicSubmitBody:
    "Help fellow citizens and UMKM business owners by reporting road conditions, flooding, or public facilities.",
  civicSubmitTitleLabel: "Incident title *",
  civicSubmitCategory: "Report category *",
  civicSubmitSeverity: "Urgency level",
  civicSubmitCoords: "Location coordinates",
  civicSubmitAutoLocate: "Detect my location",
  civicSubmitPhotos: "Upload field evidence photos (max 3)",
  civicSubmitNotes: "Notes",
  civicSubmitSend: "Send field report",
  civicSubmitCancel: "Cancel",
  civicSubmitChoosePhoto: "Choose photo",
  civicSubmitSending: "Sending report...",
  civicSeverity_low: "Low (Avoidable)",
  civicSeverity_medium: "Medium (Disrupts mobility)",
  civicSeverity_high: "High / Emergency (Dangerous)",

  // ReportImpact
  impactEyebrow: "Area condition as a signal",
  impactHeadline: "Local problems can change local decisions.",
  impactBody:
    "Community reports do not automatically decide whether a business succeeds or fails. Instead, they act as an area-condition factor — an empirical signal highlighting recurring accessibility or drainage issues before you sign a commercial lease.",
  impactBefore: "Before area condition signals",
  impactAfter: "After area condition signals",
  impactComposite: "Composite score · civic signals factored",
  impactBaseline: "Baseline market score · raw commercial data",
  impactMarketPotential: "Market potential",
  impactAreaCondition: "Area condition signal",
  impactSynthesis: "Lociva synthesis",
  impactDemoNote:
    "The score shift demonstrates how citizen data serves as an empirical signal in location analysis. Figures are illustrative examples, not live results.",
  impactSampleData: "Sample data — illustrative example, not a live result.",

  // AISection
  aiEyebrow: "AI-Powered Capabilities",
  aiHeadline: "AI-Powered Business Intelligence",
  aiBody:
    "More than location analysis. LOCIVA uses AI to help you discover opportunities, make smarter business decisions, and build a competitive advantage.",
  aiExampleLabel: "Example",
  aiDemoNote:
    "AI capabilities enhance strategic decision-making. Interpretations build upon verified empirical spatial metrics.",

  // Card 01 - AI Route Recommendation
  aiRouteNumber: "01",
  aiRouteTitle: "AI Route Recommendation",
  aiRouteBadge: "Mobility & Routing",
  aiRouteBody:
    "Recommends suitable routes based on the selected business type and its needs. Helps users identify relevant areas and potential routes for their business activities.",
  aiRoutePoint1: "Tailored pathing based on business mobility and customer catchment",
  aiRoutePoint2: "Identifies high-potential corridors and active pedestrian spots",
  aiRoutePoint3: "Helps avoid route friction and pedestrian infrastructure disruptions",
  aiRouteExample: "Recommending optimized daily routes for mobile food vendors.",

  // Card 02 - AI Business Recommendation
  aiBusinessNumber: "02",
  aiBusinessTitle: "AI Business Recommendation",
  aiBusinessBadge: "Opportunity Discovery",
  aiBusinessBody:
    "Recommends business opportunities that match the characteristics and potential of a selected location. Uses available location analysis, demographic information, nearby businesses, and competitor data.",
  aiBusinessPoint1: "Synthesizes location demographics, daytime density, and local foot traffic",
  aiBusinessPoint2: "Highlights viable business archetypes and underserved consumer demand",
  aiBusinessPoint3: "Helps users understand which business types are best suited for an area",
  aiBusinessExample: "Matching location characteristics with viable food, service, or retail concepts.",

  // Card 03 - AI Business Differentiation
  aiDiffNumber: "03",
  aiDiffTitle: "AI Business Differentiation",
  aiDiffBadge: "Competitive Strategy",
  aiDiffBody:
    "Identifies potential similarities and competition with existing businesses around a selected location. Suggests ways to differentiate the user's business, such as product variations, service concepts, target customers, and unique selling points.",
  aiDiffPoint1: "Surveys nearby competitor offerings, categories, and commercial density",
  aiDiffPoint2: "Proposes distinctive product variations, service concepts, and USPs",
  aiDiffPoint3: "Helps users avoid copying existing businesses and build distinctive concepts",
  aiDiffExample: "Formulating distinct menu offerings and operating hours to avoid direct overlap.",

  // DataIntelligence
  dataEyebrow: "Data intelligence",
  dataHeadline: "Built from multiple signals.",
  dataBody:
    "Lociva reads an area as stacked layers. Toggle individual signals below to see how different data sources enrich the map.",
  dataLayerToggle: "Toggle data layers",
  dataDemoNote:
    "Layer names describe the architectural model. No unverified API claims are presented.",

  // DataIntelligence layer labels
  dataLayerGeo: "Geographic data",
  dataLayerGeoDesc: "Street networks, parcel zoning, green parks, and building footprints.",
  dataLayerPoi: "Points of interest",
  dataLayerPoiDesc: "Universities, transit hubs, clinics, and anchor neighborhood destinations from OpenStreetMap.",
  dataLayerBusiness: "Business activity",
  dataLayerBusinessDesc: "Competitors and commercial clusters from OpenStreetMap + LOCIVA internal business database.",
  dataLayerAccess: "Accessibility",
  dataLayerAccessDesc: "Pedestrian corridors, road hierarchy, transit stops, and parking reach.",
  dataLayerReports: "Community reports",
  dataLayerReportsDesc: "Citizen-verified ground alerts: road damage, flood risk, and street lights.",
  dataLayerPopulation: "Population demographics",
  dataLayerPopulationDesc: "Official BPS population & density for supported administrative regions only.",

  // HowItWorks
  howEyebrow: "How it works",
  howHeadline: "How Lociva works",
  howBody:
    "Four intuitive steps from initial spatial question to a grounded, informed decision.",

  // HowItWorks step labels
  howStepChoose: "Choose",
  howStepChooseBody: "Choose a business or location.",
  howStepChooseDetail:
    "Pick the enterprise type you intend to start or pin a specific candidate parcel on the map.",
  howStepExplore: "Explore",
  howStepExploreBody: "Explore the surrounding area and its signals.",
  howStepExploreDetail:
    "Unpack access corridors, competitor density, and ground reports around each candidate point.",
  howStepSimulate: "Simulate",
  howStepSimulateBody: "Compare different scenarios.",
  howStepSimulateDetail:
    "Shift radiuses, test alternate street corners, or adjust operating hours to observe score variations.",
  howStepDecide: "Decide",
  howStepDecideBody: "Use the insights to make a more informed decision.",
  howStepDecideDetail:
    "Move forward with confidence, supported by objective data and neighbor-verified area realities.",

  // UseCases
  useCasesEyebrow: "Who it is for",
  useCasesHeadline: "Empowering everyone who shapes a neighborhood.",
  useCasesBody:
    "From independent cafe starters to engaged neighbors and local stakeholders.",

  useCaseBusiness: "For business owners",
  useCaseBusinessTagline: "Find a location that fits your business.",
  useCaseBusinessBody:
    "Evaluate foot traffic quality, demographic purchasing match, competitor density, and walkability factors before committing real financial capital.",
  useCaseBusinessBadge: "Commercial analytics",

  useCaseCommunity: "For communities",
  useCaseCommunityTagline: "Report and understand issues around your area.",
  useCaseCommunityBody:
    "Highlight recurring street defects, dark walkways, flooding, or sanitation bottlenecks on a shared map and confirm local conditions together.",
  useCaseCommunityBadge: "Civic collaboration",

  // CTA
  ctaHeadline: "Know the area. Then make the move.",
  ctaBody:
    "Explore locations, simulate possibilities, and understand the signals around a place.",
  ctaExploreLociva: "Explore Lociva",
  ctaViewConcept: "View the concept",

  // New section keys
  vendorRoutesEyebrow: "Mobile vendor routes",
  vendorRoutesHeadline: "Plan selling routes on real roads.",
  vendorRoutesBody:
    "Mobile vendors can plan multi-stop routes along real OSM road networks, save them privately, and optionally share publicly. Routes are private by default — sharing is an explicit opt-in action. There is no real-time tracking.",
  vendorRoutesWaypoints: "Waypoints",
  vendorRoutesWaypointsBody:
    "Add, reorder, and delete stops along a route. Click on the map to place waypoints.",
  vendorRoutesRouting: "Real road routing",
  vendorRoutesRoutingBody:
    "Routes are calculated over the OpenStreetMap road network via OSRM, giving real drivable/walkable paths — not straight-line distances.",
  vendorRoutesSave: "Save & share",
  vendorRoutesSaveBody:
    "Save routes to your account. Delete routes you no longer need. Public sharing is opt-in and never automatic.",
  vendorRoutesSpotJitu: "Spot jitu selling-spot recommendations",
  vendorRoutesSpotJituBody:
    "Get recommended selling spots near high-footfall facilities (campuses, transit hubs, markets, schools) with reasons shown and a methodology disclaimer.",
  vendorRoutesPrivate: "Private by default · No real-time tracking",
  vendorRoutesDemoVendors: "Demo vendors",
  vendorRoutesDemoVendorsBody:
    "Sample vendors are clearly labeled [DEMO] and seeded via the Laravel API — they are not real active users.",
  vendorRoutesSampleData: "Sample data — illustrative example, not a live result.",

  savedCandidatesEyebrow: "Saved candidates & compare",
  savedCandidatesHeadline: "Save and compare candidate locations.",
  savedCandidatesBody:
    "Pin up to five candidate points on the map, run a location potential analysis for each, and save them to your account. Select which candidates to compare side by side.",
  savedCandidatesSave: "Save candidate",
  savedCandidatesSaveBody:
    "Explicitly save a candidate point to the database (marker drag does not auto-save).",
  savedCandidatesCompare: "Compare candidates",
  savedCandidatesCompareBody:
    "Choose which candidates (A/B/C) to compare side by side using real analysis outputs.",
  savedCandidatesDelete: "Delete saved candidate",
  savedCandidatesDeleteBody:
    "Remove saved candidates you no longer need, with success/error feedback.",
  savedCandidatesSampleData: "Sample data — illustrative example, not a live result.",

  mapToolsEyebrow: "Interactive map tools",
  mapToolsHeadline: "Explore the map with built-in tools.",
  mapToolsBody:
    "Search places (Nominatim), switch between map and satellite basemaps, use the GPS button to center on your location, view clustered POI markers, and control data layers.",
  mapToolsSearch: "Place search",
  mapToolsSearchBody: "Search for locations worldwide via Nominatim (OpenStreetMap).",
  mapToolsBasemap: "Map / satellite basemap",
  mapToolsBasemapBody: "Switch between the default map and satellite imagery.",
  mapToolsGps: "GPS location",
  mapToolsGpsBody:
    "Center the map on your device location with explicit opt-in permission. No silent tracking.",
  mapToolsClustering: "Marker clustering",
  mapToolsClusteringBody:
    "Nearby POIs are shown as clustered markers that expand as you zoom in.",
  mapToolsLayers: "Data layer controls",
  mapToolsLayersBody:
    "Toggle OpenStreetMap POIs, LOCIVA internal businesses, civic reports, and BPS demographic layers.",
  mapToolsNotMalangOnly: "Not limited to Malang",
  mapToolsNotMalangOnlyBody:
    "The map loads data by viewport and supports browsing beyond Malang — coverage depends on OpenStreetMap contributors in each region.",
  mapToolsSampleData: "Sample data — illustrative example, not a live result.",

  dataTransparencyEyebrow: "Data transparency",
  dataTransparencyHeadline: "Know where each data point comes from.",
  dataTransparencyBody:
    "The analysis panel shows how many POIs come from OpenStreetMap versus LOCIVA's internal database, plus BPS demographic coverage for supported regions, with limitation disclaimers.",
  dataTransparencyOsm: "OpenStreetMap POIs",
  dataTransparencyOsmBody:
    "Public facilities and businesses from OpenStreetMap (via LOCIVA's own API over imported Geofabrik data). Coverage varies by region.",
  dataTransparencyInternal: "LOCIVA internal businesses",
  dataTransparencyInternalBody:
    "Registered businesses stored in LOCIVA's own database, synced per-user.",
  dataTransparencyBps: "BPS RI demographics",
  dataTransparencyBpsBody:
    "Official population and density statistics from Badan Pusat Statistik for supported administrative regions only.",
  dataTransparencyReports: "Community reports",
  dataTransparencyReportsBody:
    "Citizen-submitted infrastructure reports used as area-condition signals.",
  dataTransparencySampleData: "Sample data — illustrative example, not a live result.",

  invalidLocationEyebrow: "Invalid location handling",
  invalidLocationHeadline: "Unsupported areas show an honest state.",
  invalidLocationBody:
    "If a candidate point is placed in the sea or an unsupported area, the analysis returns an insufficient-data state instead of a misleading score. Coordinates are validated against real geospatial data before scoring.",
  invalidLocationSampleData: "Sample data — illustrative example, not a live result.",

  privacyEyebrow: "Privacy principles",
  privacyHeadline: "Your location stays yours.",
  privacyBody:
    "Live location sharing is opt-in only and stops when you disable it. Routes are private by default; sharing requires an explicit action. Demo vendors are labeled [DEMO] and are not real users.",
  privacyOptIn: "Opt-in location sharing",
  privacyOptInBody:
    "GPS location is shared only when you explicitly enable it and grant browser permission.",
  privacyPrivateRoutes: "Routes private by default",
  privacyPrivateRoutesBody:
    "Saved routes are not shared publicly unless you explicitly choose to share.",
  privacyNoTracking: "No real-time tracking",
  privacyNoTrackingBody:
    "There is no location broadcasting or continuous tracking of users or vendors.",
  privacySampleData: "Sample data — illustrative example, not a live result.",

  dataSourcesEyebrow: "Data sources & limits",
  dataSourcesHeadline: "Data sources & limitations",
  dataSourcesOsm: "OpenStreetMap",
  dataSourcesOsmBody:
    "Points of interest, roads, and land use. Coverage depends on local contributors and varies by region.",
  dataSourcesOsmrm: "OSRM routing",
  dataSourcesOsmrmBody:
    "Real road network routing via the public OSRM demo server (router.project-osrm.org). Not suitable for production traffic volumes.",
  dataSourcesNominatim: "Nominatim search",
  dataSourcesNominatimBody:
    "Place geocoding and autocomplete via Nominatim (OpenStreetMap). Limited to 1 request/second.",
  dataSourcesCommunity: "Community reports",
  dataSourcesCommunityBody:
    "Citizen-submitted infrastructure reports with photos and verification status.",
  dataSourcesLocivaDb: "LOCIVA internal database",
  dataSourcesLocivaDbBody:
    "Registered businesses and internal POIs stored in LOCIVA's own PostgreSQL database.",
  dataSourcesBps: "BPS RI demographics",
  dataSourcesBpsBody:
    "Official population and density statistics from Badan Pusat Statistik for supported administrative regions only (Malang, Bandung, Jakarta, and surrounding regencies).",
  dataSourcesLimits: "Limitations",
  dataSourcesLimitsBody:
    "OSM coverage varies by region and cannot be treated as complete. Scores are decision-support indices, not revenue guarantees or live traffic data. There is no real-time traffic.",
  dataSourcesAttribution:
    "Attribution: map data © OpenStreetMap contributors · routing via OSRM · BPS data via Badan Pusat Statistik.",

  // FAQ
  faqEyebrow: "Frequently asked questions",
  faqHeadline: "Common questions about LOCIVA",
  faqBody:
    "Answers to the most common questions about location intelligence, data sources, and how LOCIVA works.",

  // Footer
  footerBuilt: "Built for better decisions, one area at a time.",
  footerPrototype:
    "Prototype & demonstration model · All simulation data for concept demonstration.",
  footerLociva: "Lociva",
  footerSubtitle: "Location intelligence & civic analytics",

  // New sections
  vendorRoutesEyebrow: "Mobile vendor routes",
  vendorRoutesHeadline: "Plan selling routes on real roads.",
  vendorRoutesBody:
    "Mobile vendors can plan multi-stop routes along real OSM road networks, save them privately, and optionally share publicly. Routes are private by default — sharing is an explicit opt-in action. There is no real-time tracking.",
  vendorRoutesWaypoints: "Waypoints",
  vendorRoutesWaypointsBody:
    "Add, reorder, and delete stops along a route. Click on the map to place waypoints.",
  vendorRoutesRouting: "Real road routing",
  vendorRoutesRoutingBody:
    "Routes are calculated over the OpenStreetMap road network via OSRM, giving real drivable/walkable paths — not straight-line distances.",
  vendorRoutesSave: "Save & share",
  vendorRoutesSaveBody:
    "Save routes to your account. Delete routes you no longer need. Public sharing is opt-in and never automatic.",
  vendorRoutesSpotJitu: "Spot jitu selling-spot recommendations",
  vendorRoutesSpotJituBody:
    "Get recommended selling spots near high-footfall facilities (campuses, transit hubs, markets, schools) with reasons shown and a methodology disclaimer.",
  vendorRoutesPrivate: "Private by default · No real-time tracking",
  vendorRoutesDemoVendors: "Demo vendors",
  vendorRoutesDemoVendorsBody:
    "Sample vendors are clearly labeled [DEMO] and seeded via the Laravel API — they are not real active users.",
  vendorRoutesSampleData: "Sample data — illustrative example, not a live result.",

  savedCandidatesEyebrow: "Saved candidates & compare",
  savedCandidatesHeadline: "Save and compare candidate locations.",
  savedCandidatesBody:
    "Pin up to five candidate points on the map, run a location potential analysis for each, and save them to your account. Select which candidates to compare side by side.",
  savedCandidatesSave: "Save candidate",
  savedCandidatesSaveBody:
    "Explicitly save a candidate point to the database (marker drag does not auto-save).",
  savedCandidatesCompare: "Compare candidates",
  savedCandidatesCompareBody:
    "Choose which candidates (A/B/C) to compare side by side using real analysis outputs.",
  savedCandidatesDelete: "Delete saved candidate",
  savedCandidatesDeleteBody:
    "Remove saved candidates you no longer need, with success/error feedback.",
  savedCandidatesSampleData: "Sample data — illustrative example, not a live result.",

  mapToolsEyebrow: "Interactive map tools",
  mapToolsHeadline: "Explore the map with built-in tools.",
  mapToolsBody:
    "Search places (Nominatim), switch between map and satellite basemaps, use the GPS button to center on your location, view clustered POI markers, and control data layers.",
  mapToolsSearch: "Place search",
  mapToolsSearchBody: "Search for locations worldwide via Nominatim (OpenStreetMap).",
  mapToolsBasemap: "Map / satellite basemap",
  mapToolsBasemapBody: "Switch between the default map and satellite imagery.",
  mapToolsGps: "GPS location",
  mapToolsGpsBody:
    "Center the map on your device location with explicit opt-in permission. No silent tracking.",
  mapToolsClustering: "Marker clustering",
  mapToolsClusteringBody:
    "Nearby POIs are shown as clustered markers that expand as you zoom in.",
  mapToolsLayers: "Data layer controls",
  mapToolsLayersBody:
    "Toggle OpenStreetMap POIs, LOCIVA internal businesses, civic reports, and BPS demographic layers.",
  mapToolsNotMalangOnly: "Not limited to Malang",
  mapToolsNotMalangOnlyBody:
    "The map loads data by viewport and supports browsing beyond Malang — coverage depends on OpenStreetMap contributors in each region.",
  mapToolsSampleData: "Sample data — illustrative example, not a live result.",

  dataTransparencyEyebrow: "Data transparency",
  dataTransparencyHeadline: "Know where each data point comes from.",
  dataTransparencyBody:
    "The analysis panel shows how many POIs come from OpenStreetMap versus LOCIVA's internal database, plus BPS demographic coverage for supported regions, with limitation disclaimers.",
  dataTransparencyOsm: "OpenStreetMap POIs",
  dataTransparencyOsmBody:
    "Public facilities and businesses from OpenStreetMap (via LOCIVA's own API over imported Geofabrik data). Coverage varies by region.",
  dataTransparencyInternal: "LOCIVA internal businesses",
  dataTransparencyInternalBody:
    "Registered businesses stored in LOCIVA's own database, synced per-user.",
  dataTransparencyBps: "BPS RI demographics",
  dataTransparencyBpsBody:
    "Official population and density statistics from Badan Pusat Statistik for supported administrative regions only.",
  dataTransparencyReports: "Community reports",
  dataTransparencyReportsBody:
    "Citizen-submitted infrastructure reports used as area-condition signals.",
  dataTransparencySampleData: "Sample data — illustrative example, not a live result.",

  invalidLocationEyebrow: "Invalid location handling",
  invalidLocationHeadline: "Unsupported areas show an honest state.",
  invalidLocationBody:
    "If a candidate point is placed in the sea or an unsupported area, the analysis returns an insufficient-data state instead of a misleading score. Coordinates are validated against real geospatial data before scoring.",
  invalidLocationSampleData: "Sample data — illustrative example, not a live result.",

  privacyEyebrow: "Privacy principles",
  privacyHeadline: "Your location stays yours.",
  privacyBody:
    "Live location sharing is opt-in only and stops when you disable it. Routes are private by default; sharing requires an explicit action. Demo vendors are labeled [DEMO] and are not real users.",
  privacyOptIn: "Opt-in location sharing",
  privacyOptInBody:
    "GPS location is shared only when you explicitly enable it and grant browser permission.",
  privacyPrivateRoutes: "Routes private by default",
  privacyPrivateRoutesBody:
    "Saved routes are not shared publicly unless you explicitly choose to share.",
  privacyNoTracking: "No real-time tracking",
  privacyNoTrackingBody:
    "There is no location broadcasting or continuous tracking of users or vendors.",
  privacySampleData: "Sample data — illustrative example, not a live result.",

  dataSourcesEyebrow: "Data sources & limits",
  dataSourcesHeadline: "Data sources & limitations",
  dataSourcesOsm: "OpenStreetMap",
  dataSourcesOsmBody:
    "Points of interest, roads, and land use. Coverage depends on local contributors and varies by region.",
  dataSourcesOsmrm: "OSRM routing",
  dataSourcesOsmrmBody:
    "Real road network routing via the public OSRM demo server (router.project-osrm.org). Not suitable for production traffic volumes.",
  dataSourcesNominatim: "Nominatim search",
  dataSourcesNominatimBody:
    "Place geocoding and autocomplete via Nominatim (OpenStreetMap). Limited to 1 request/second.",
  dataSourcesCommunity: "Community reports",
  dataSourcesCommunityBody:
    "Citizen-submitted infrastructure reports with photos and verification status.",
  dataSourcesLocivaDb: "LOCIVA internal database",
  dataSourcesLocivaDbBody:
    "Registered businesses and internal POIs stored in LOCIVA's own PostgreSQL database.",
  dataSourcesBps: "BPS RI demographics",
  dataSourcesBpsBody:
    "Official population and density statistics from Badan Pusat Statistik for supported administrative regions only (Malang, Bandung, Jakarta, and surrounding regencies).",
  dataSourcesLimits: "Limitations",
  dataSourcesLimitsBody:
    "OSM coverage varies by region and cannot be treated as complete. Scores are decision-support indices, not revenue guarantees or live traffic data. There is no real-time traffic.",
  dataSourcesAttribution:
    "Attribution: map data © OpenStreetMap contributors · routing via OSRM · BPS data via Badan Pusat Statistik.",
};

export const id = {
  // Common
  appName: "LOCIVA",
  tagline: "Intelijen Lokasi & Analitik Kewargaan",
  exploreTheMap: "Jelajahi peta",
  seeHowItWorks: "Lihat cara kerjanya",
  learnMore: "Pelajari lebih lanjut",
  viewTheConcept: "Lihat konsep",
  login: "Masuk",
  register: "Daftar",
  logout: "Keluar",
  peta: "Peta",

  // Nav
  navProduct: "Produk",
  navHowItWorks: "Cara kerja",
  navIntelligence: "Intelijen",
  navReports: "Laporan",
  navAbout: "Tentang",

  // Hero
  heroEyebrow: "Intelijen lokasi & analitik kewargaan",
  heroHeadline: "Pahami daerah sebelum Anda memutuskan.",
  heroBody:
    "Lociva menggabungkan data lokasi, analisis bisnis, dan laporan masyarakat untuk membantu Anda memahami apa yang terjadi di sekitar sebuah tempat sebelum mengambil keputusan.",
  heroSignalGeo: "Lapisan spasial",
  heroSignalReports: "Laporan kondisi warga",
  heroSignalScore: "Skor potensi lokasi",

  // TrustStrip
  trustEyebrow: "Satu daerah. Berbagai perspektif.",
  trustSubtitle: "Kerangka intelijen multi-lapisan",
  trustDemoNote:
    "Sinyal yang ditampilkan merupakan ilustrasi model analitik LOCIVA. Tidak ada angka yang disajikan sebagai metrik municipal live.",

  // TrustStrip signal labels
  trustSignalPopulation: "Data populasi",
  trustSignalPopulationNote: "Siapa yang tinggal, bekerja, dan bergerak di sekitar",
  trustSignalPopulationIndicator: "Kepadatan & demografi",
  trustSignalBusiness: "Aktivitas bisnis",
  trustSignalBusinessNote: "Toko yang ada, kompetitor & lalu lintas kaki",
  trustSignalBusinessIndicator: "Saturasi komersial",
  trustSignalReports: "Laporan daerah",
  trustSignalReportsNote: "Masalah infrastruktur yang diamati masyarakat",
  trustSignalReportsIndicator: "Kebenaran dasar terverifikasi",
  trustSignalAccess: "Sinyal lokasi",
  trustSignalAccessNote: "Aksesibilitas, catchment & kompatibilitas",
  trustSignalAccessIndicator: "Prediktif skor",

  // ProblemSection
  problemEyebrow: "Masalah",
  problemHeadline: "Tempat ramai bukan selalu tempat yang tepat.",
  problemBody:
    "Lalu lintas kaki dapat tampak menarik di permukaan sambil menyembunyikan kompetisi yang ketat, aksesibilitas pejalan kaki yang buruk, atau gangguan infrastruktur kewargaan yang berulang. Lociva menganalisis lokasi sebagai komposit sinyal.",
  problemSignalWeight: "Bobot sinyal ·",

  // ProblemSection factor labels
  factorPedestrian: "Aktivitas pejalan kaki",
  factorPopulation: "Populasi",
  factorAccessibility: "Aksesibilitas",
  factorTargetMarket: "Sasaran pasar",
  factorCompetition: "Kompetisi",
  factorAreaCondition: "Kondisi daerah",
  factorPedestrianCheck:
    "Lalu lintas kaki tinggi mungkin hanya oleh commuter yang bergegas ke transit, bukan calon pelanggan.",
  factorPopulationCheck:
    "Jumlah penduduk padat hanya penting jika daya beli dan gaya hidup cocok dengan titik harga produk Anda.",
  factorAccessibilityCheck:
    "Trottoar sempit dan tidak adanya parkir atau titik drop-off menciptakan hambatan bagi pengunjung berulang.",
  factorTargetMarketCheck:
    "Orang yang melewati harus secara aktif mencari apa yang Anda jual pada jam buka Anda.",
  factorCompetitionCheck:
    "Saturasi dapat segera merusak margin jika banyak rival menawarkan menu yang sama persis.",
  factorAreaConditionCheck:
    "Banjir berulang dan trotoar rusak secara langsung mengganggu akses pelanggan dan armada pengiriman.",

  // ProductFlow
  productEyebrow: "Produk inti",
  productHeadline: "Dari lokasi ke keputusan.",
  productBody:
    "Jalur yang metodis dan didukung data yang mengeliminasi intuisi buta saat mengevaluasi ruang fisik.",

  // ProductFlow step labels
  stepChoose: "Pilih bisnis",
  stepChooseBody:
    "Pilih kategori bisnis yang akan Anda mulai, dari gerobak hingga tempat duduk.",
  stepPlace: "Tempatkan di peta",
  stepPlaceBody:
    "Pin lokasi kandidat dan tentukan radius catchment jalan kaki khusus.",
  stepAnalyze: "Analisis daerah",
  stepAnalyzeBody:
    "Baca koridor akses, klaster kompetitor, dan sinyal kewargaan di sekitar setiap titik kandidat.",
  stepUnderstand: "Pahami skor",
  stepUnderstandBody:
    "Buka 'mengapa?' untuk membuka apa yang meningkatkan atau menurunkan Skor Potensi Lokasi Anda.",
  stepSimulate: "Simulasikan skenario lain",
  stepSimulateBody:
    "Uji sudut jalan alternatif atau tipe bisnis untuk membandingkan potensi lokasi berdampingan.",
  stepDecide: "Buat keputusan yang lebih baik",
  stepDecideBody:
    "Comitkan modal nyata dengan mata yang jelas dan kebenaran dasar lokasi yang dapat diverifikasi.",

  // BusinessSimulation
  simEyebrow: "Simulasi bisnis",
  simHeadline: "Simulasikan sebelum berinvestasi.",
  simBody:
    "Uji ide dan lokasi bisnis yang berbeda sebelum meluangkan sumber daya nyata.",
  simBusiness: "Bisnis:",
  simRadius: "Radius:",
  simCatchment: "Catchment simulasi",
  simCompetitors: "kompetitor dalam",
  simScore: "Skor potensi lokasi",
  simFactorBreakdown: "Rincian faktor",
  simOpenWhy: "Buka mengapa?",
  simTone_potential: "Potensi",
  simTone_consideration: "Pertimbangan",
  simTone_warning: "Perlu tinjauan",
  simDemoNote:
    "Skor diperbarui secara interaktif berdasarkan dinamika kategori bisnis dan model jalan kaki catchment. Angka adalah data simulasi, bukan hasil live.",
  simSampleData: "Data contoh — ilustrasi, bukan hasil live.",

  // Factor labels (used in BusinessSimulation & ScoreBreakdown)
  factorLabels_population: "Populasi",
  factorLabels_pedestrian: "Potensi pejalan kaki",
  factorLabels_accessibility: "Aksesibilitas",
  factorLabels_targetMarket: "Sasaran pasar",
  factorLabels_competition: "Kompetisi",
  factorLabels_compatibility: "Kompatibilitas area",

  // ScoreBreakdown
  scoreEyebrow: "Skor potensi lokasi",
  scoreHeadline: "Skor berguna jika Anda tahu mengapa.",
  scoreComposite: "Skor komposit",
  scoreWhy: "Mengapa?",
  scoreOverallSynthesis: "Sintesis keseluruhan",
  scoreFactorBreakdown: "Rincian faktor",
  scoreSixSignals: "6 sinyal dievaluasi",
  scoreDemoNote: "Angka yang ditampilkan adalah data simulasi / demo, bukan statistik kota live.",
  scoreSampleData: "Data contoh — ilustrasi, bukan hasil live.",

  // WhatIfSimulation
  whatifEyebrow: "Simulasi what-if",
  whatifHeadline: "Bagaimana jika Anda mengubah lokasi?",
  whatifBody:
    "Bisnis yang sama, daerah yang berbeda. Bandingkan lokasi kandidat berdampingan atau atur parameter operasional untuk melihat bagaimana skor dihitung ulang.",
  whatifRecalculate: "Hitung ulang variabel",
  whatifBusinessType: "Tipe bisnis",
  whatifTargetMarket: "Sasaran pasar",
  whatifOperatingHours: "Jam operasional",
  whatifRadius: "Radius catchment",
  whatifDemoNote:
    "Model demonstrasi: mengubah palang secara dinamis memperbarui estimasi skor untuk semua tiga lokasi secara bersamaan. Angka adalah contoh ilustratif, bukan hasil live.",
  whatifSampleData: "Data contoh — ilustrasi, bukan hasil live.",

  // CivicReport
  civicEyebrow: "Intelijen kewargaan",
  civicHeadline: "Pahami apa yang terjadi di sekitar Anda.",
  civicBody:
    "Warga mem-pin kenyataan lapangan di peta, mengunggah foto, dan membiarkan tetangga memverifikasi apa yang mereka lihat. Laporan ini langsung menyumbangkan sinyal kondisi area ke platform, bukan tertunda dalam kotak pengaduan terisolasi.",
  civicReportIssue: "Laporkan masalah wilayah",
  civicReportLifecycle: "Siklus laporan",
  civicStatus: "Status:",
  civicConfirm: "Konfirmasi ini masih terjadi",
  civicConfirmed: "Anda dan {count} tetangga mengonfirmasi ini",
  civicDemoNote:
    "Laporan kewargaan bertindak sebagai sinyal dasar. Tetangga memverifikasi kondisi untuk menjaga data segar dan dapat ditindaklanjuti.",
  civicSubmitTitle: "Laporkan kondisi / masalah lapangan",
  civicSubmitBody:
    "Bantu warga sesama dan pemilik usaha UMKM dengan melaporkan kondisi jalan, banjir, atau fasilitas umum.",
  civicSubmitTitleLabel: "Judul insiden *",
  civicSubmitCategory: "Kategori laporan *",
  civicSubmitSeverity: "Tingkat urgensi",
  civicSubmitCoords: "Koordinat lokasi",
  civicSubmitAutoLocate: "Deteksi lokasi saya",
  civicSubmitPhotos: "Unggah foto bukti lapangan (maks 3)",
  civicSubmitNotes: "Catatan",
  civicSubmitSend: "Kirim laporan lapangan",
  civicSubmitCancel: "Batal",
  civicSubmitChoosePhoto: "Pilih foto",
  civicSubmitSending: "Mengirim laporan...",
  civicSeverity_low: "Rendah (Dapat dihindari)",
  civicSeverity_medium: "Sedang (Mengganggu mobilitas)",
  civicSeverity_high: "Tinggi / Darurat (Membahayakan)",

  // ReportImpact
  impactEyebrow: "Kondisi daerah sebagai sinyal",
  impactHeadline: "Masalah lokal dapat mengubah keputusan lokal.",
  impactBody:
    "Laporan komunitas tidak secara otomatis memutuskan apakah sebuah bisnis sukses atau gagal. Sebaliknya, mereka bertindak sebagai faktor kondisi area — sinyal empiris yang menyoroti masalah aksesibilitas atau drainase yang berulang sebelum Anda menandatangani sewa komersial.",
  impactBefore: "Sebelum sinyal kondisi area",
  impactAfter: "Setelah sinyal kondisi area",
  impactComposite: "Skor komposit · sinyal kewargaan difaktorkan",
  impactBaseline: "Skor pasar dasar · data komersial mentah",
  impactMarketPotential: "Potensi pasar",
  impactAreaCondition: "Sinyal kondisi area",
  impactSynthesis: "Sintesis Lociva",
  impactDemoNote:
    "Perubahan skor menunjukkan bagaimana data warga berfungsi sebagai sinyal empiris dalam analisis lokasi. Angka adalah contoh ilustratif, bukan hasil live.",
  impactSampleData: "Data contoh — ilustrasi, bukan hasil live.",

  // AISection
  aiEyebrow: "Kapabilitas Bertenaga AI",
  aiHeadline: "AI-Powered Business Intelligence",
  aiBody:
    "Lebih dari sekadar analisis lokasi. LOCIVA menggunakan AI untuk membantu Anda menemukan peluang, mengambil keputusan bisnis yang lebih cerdas, dan membangun keunggulan kompetitif.",
  aiExampleLabel: "Contoh",
  aiDemoNote:
    "Kapabilitas AI memperkuat pengambilan keputusan strategis. Interpretasi AI dibangun di atas data spasial empiris yang terverifikasi.",

  // Card 01 - AI Route Recommendation
  aiRouteNumber: "01",
  aiRouteTitle: "AI Route Recommendation",
  aiRouteBadge: "Mobilitas & Rute",
  aiRouteBody:
    "Merekomendasikan rute yang sesuai berdasarkan jenis bisnis yang dipilih dan kebutuhannya. Membantu pengguna mengidentifikasi area yang relevan dan rute potensial untuk aktivitas bisnis mereka.",
  aiRoutePoint1: "Perutean terarah berdasarkan mobilitas usaha dan jangkauan konsumen",
  aiRoutePoint2: "Mengidentifikasi koridor komersial potensial dan titik henti strategis",
  aiRoutePoint3: "Membantu menghindari hambatan jalan dan gangguan infrastruktur pejalan kaki",
  aiRouteExample: "Merekomendasikan rute harian optimal untuk pedagang makanan keliling.",

  // Card 02 - AI Business Recommendation
  aiBusinessNumber: "02",
  aiBusinessTitle: "AI Business Recommendation",
  aiBusinessBadge: "Peluang Usaha",
  aiBusinessBody:
    "Merekomendasikan peluang bisnis yang cocok dengan karakteristik dan potensi lokasi yang dipilih. Menggunakan analisis lokasi yang tersedia, informasi demografis, bisnis sekitar, dan data kompetitor.",
  aiBusinessPoint1: "Menganalisis demografi lingkungan, kepadatan harian, dan arus pejalan kaki",
  aiBusinessPoint2: "Menyoroti kategori bisnis yang cocok dan kebutuhan pasar yang belum terlayani",
  aiBusinessPoint3: "Membantu pengguna memahami jenis bisnis mana yang cocok untuk suatu area",
  aiBusinessExample: "Mencocokkan karakteristik lokasi dengan konsep kuliner, jasa, atau ritel yang tepat.",

  // Card 03 - AI Business Differentiation
  aiDiffNumber: "03",
  aiDiffTitle: "AI Business Differentiation",
  aiDiffBadge: "Strategi Kompetitif",
  aiDiffBody:
    "Mengidentifikasi potensi kemiripan dan persaingan dengan bisnis yang ada di sekitar lokasi terpilih. Menyarankan cara mendiferensiasikan bisnis, seperti variasi produk, konsep layanan, target pelanggan, dan proposisi nilai unik.",
  aiDiffPoint1: "Memetakan penawaran kompetitor sekitar, kategori usaha, dan kepadatan komersial",
  aiDiffPoint2: "Menyarankan variasi produk, konsep layanan, dan keunggulan unik (USP)",
  aiDiffPoint3: "Membantu pengguna menghindari sekadar meniru bisnis yang sudah ada dan membangun konsep yang khas",
  aiDiffExample: "Merumuskan variasi menu khas dan jam operasional berbeda untuk menghindari tumpang tindih.",

  // DataIntelligence
  dataEyebrow: "Intelijen data",
  dataHeadline: "Dibangun dari banyak sinyal.",
  dataBody:
    "Lociva membaca daerah sebagai lapisan tumpukan. Aktifkan sinyal individu di bawah ini untuk melihat bagaimana berbagai sumber data memperkaya peta.",
  dataLayerToggle: "Aktifkan lapisan data",
  dataDemoNote:
    "Nama lapisan menggambarkan model arsitektur. Tidak ada klaim API unverified yang disajikan.",

  // DataIntelligence layer labels
  dataLayerGeo: "Data geografis",
  dataLayerGeoDesc: "Jaringan jalan, pembagian perumahan, taman hijau, dan jejak bangunan.",
  dataLayerPoi: "Titik minat",
  dataLayerPoiDesc: "Universitas, hub transit, klinik, dan destinasi lingkungan dari OpenStreetMap.",
  dataLayerBusiness: "Aktivitas bisnis",
  dataLayerBusinessDesc: "Kompetitor dan klaster komersial dari OpenStreetMap + database bisnis internal LOCIVA.",
  dataLayerAccess: "Aksesibilitas",
  dataLayerAccessDesc: "Koridor pejalan kaki, hierarki jalan, halte transit, dan akses parkir.",
  dataLayerReports: "Laporan masyarakat",
  dataLayerReportsDesc: "Peringatan tanah yang diverifikasi warga: kerusakan jalan, risiko banjir, dan lampu jalan.",
  dataLayerPopulation: "Demografi populasi",
  dataLayerPopulationDesc: "Populasi & kepadatan resmi BPS untuk wilayah administratif yang didukung saja.",

  // HowItWorks
  howEyebrow: "Cara kerja",
  howHeadline: "Cara Kerja Lociva",
  howBody:
    "Empat langkah intuitif dari pertanyaan spasial awal ke keputusan yang terlandaskan dan tepat.",

  // HowItWorks step labels
  howStepChoose: "Pilih",
  howStepChooseBody: "Pilih bisnis atau lokasi.",
  howStepChooseDetail:
    "Pilih tipe usaha yang akan Anda mulai atau pin suatu kavling lokasi kandidat tertentu di peta.",
  howStepExplore: "Jelajahi",
  howStepExploreBody: "Jelajahi area sekitar dan sinyalnya.",
  howStepExploreDetail:
    "Buka koridor akses, kepadatan kompetitor, dan laporan lapangan di sekitar setiap titik kandidat.",
  howStepSimulate: "Simulasikan",
  howStepSimulateBody: "Bandingkan skenario berbeda.",
  howStepSimulateDetail:
    "Ubah radius, uji sudut jalan berbeda, atau atur jam operasional untuk mengamati variasi skor.",
  howStepDecide: "Putuskan",
  howStepDecideBody: "Gunakan insight untuk membuat keputusan yang lebih tepat.",
  howStepDecideDetail:
    "Majukan dengan keyakinan, didukung oleh data objektif dan kenyataan area yang diverifikasi tetangga.",

  // UseCases
  useCasesEyebrow: "Siapa yang menjadi sasaran",
  useCasesHeadline: "Memberdayakan semua orang yang membentuk lingkungan.",
  useCasesBody:
    "Dari pemilik kafe mandiri hingga tetangga yang aktif dan pemangku kepentingan lokal.",

  useCaseBusiness: "Untuk pemilik bisnis",
  useCaseBusinessTagline: "Temukan lokasi yang cocok untuk bisnis Anda.",
  useCaseBusinessBody:
    "Evaluasi kualitas lalu lintas kaki, kecocokan demografi daya beli, kepadatan kompetitor, dan faktor jalan kaki sebelum meluangkan modal finansial nyata.",
  useCaseBusinessBadge: "Analitik komersial",

  useCaseCommunity: "Untuk masyarakat",
  useCaseCommunityTagline: "Laporkan dan pahami masalah di sekitar daerah Anda.",
  useCaseCommunityBody:
    "SorotDefek jalan yang berulang, trotoar gelap, banjir, atau macetnya sanitasi pada peta bersama dan konfirmasikan kondisi lokal bersama.",
  useCaseCommunityBadge: "Kolaborasi kewargaan",

  // CTA
  ctaHeadline: "Ketahui daerah. Lalu lakukan langkah.",
  ctaBody:
    "Jelajahi lokasi, simulasi kemungkinan, dan pahami sinyal di sekitar sebuah tempat.",
  ctaExploreLociva: "Jelajahi Lociva",
  ctaViewConcept: "Lihat konsep",

  // New section keys
  vendorRoutesEyebrow: "Rute pedagang keliling",
  vendorRoutesHeadline: "Rencanakan rute penjualan di jalan nyata.",
  vendorRoutesBody:
    "Pedagang keliling dapat merencanakan rute multi-berhenti di sepanjang jaringan jalan OSM nyata, menyimpannya secara pribadi, dan secara opsional membagikannya secara publik. Rute pribadi secara default — berbagi adalah tindakan opt-in eksplisit. Tidak ada pelacakan real-time.",
  vendorRoutesWaypoints: "Titik pengantar",
  vendorRoutesWaypointsBody:
    "Tambah, urut ulang, dan hapus berhenti di sepanjang rute. Klik di peta untuk menempatkan titik pengantar.",
  vendorRoutesRouting: "Routing jalan nyata",
  vendorRoutesRoutingBody:
    "Rute dihitung melalui jaringan jalan OpenStreetMap via OSRM, memberikan jalur nyata yang dapat diemudi/dijalanaki — bukan jarak garis lurus.",
  vendorRoutesSave: "Simpan & bagikan",
  vendorRoutesSaveBody:
    "Simpan rute ke akun Anda. Hapus rute yang tidak lagi diperlukan. Berbagi publik adalah opt-in dan tidak pernah otomatis.",
  vendorRoutesSpotJitu: "Rekomendasi titik jualan spot jitu",
  vendorRoutesSpotJituBody:
    "Dapatkan rekomendasi titik penjualan di dekat fasilitas lalu lintas kaki tinggi (kampus, hub transit, pasar, sekolah) dengan alasan yang ditampilkan dan disclaimer metodologi.",
  vendorRoutesPrivate: "Pribadi secara default · Tidak ada pelacakan real-time",
  vendorRoutesDemoVendors: "Demo vendors",
  vendorRoutesDemoVendorsBody:
    "Vendor contoh dipastikan diberi label [DEMO] dan ditanam melalui API Laravel — mereka bukan pengguna aktif nyata.",
  vendorRoutesSampleData: "Data contoh — ilustrasi, bukan hasil live.",

  savedCandidatesEyebrow: "Kandidat tersimpan & bandingkan",
  savedCandidatesHeadline: "Simpan dan bandingkan lokasi kandidat.",
  savedCandidatesBody:
    "Pin hingga lima titik kandidat di peta, jalankan analisis potensi lokasi untuk masing-masing, dan simpan ke akun Anda. Pilih kandidat mana yang akan dibandingkan berdampingan.",
  savedCandidatesSave: "Simpan kandidat",
  savedCandidatesSaveBody:
    "Simpan secara eksplisit titik kandidat ke database (geser marker tidak auto-save).",
  savedCandidatesCompare: "Bandingkan kandidat",
  savedCandidatesCompareBody:
    "Pilih kandidat mana (A/B/C) yang akan dibandingkan berdampingan menggunakan output analisis nyata.",
  savedCandidatesDelete: "Hapus kandidat tersimpan",
  savedCandidatesDeleteBody:
    "Hapus kandidat tersimpan yang tidak lagi diperlukan, dengan umpan balik sukses/error.",
  savedCandidatesSampleData: "Data contoh — ilustrasi, bukan hasil live.",

  mapToolsEyebrow: "Alat peta interaktif",
  mapToolsHeadline: "Jelajahi peta dengan alat bawaan.",
  mapToolsBody:
    "Cari tempat (Nominatim), beralih antara peta dan basemap satelit, gunakan tombol GPS untuk memusatkan lokasi Anda, lihat penanda POI yang diklusterkontrol, dan kontrol lapisan data.",
  mapToolsSearch: "Pencarian tempat",
  mapToolsSearchBody: "Cari lokasi di seluruh dunia melalui Nominatim (OpenStreetMap).",
  mapToolsBasemap: "Basemap peta / satelit",
  mapToolsBasemapBody: "Beralih antara peta default dan citra satelit.",
  mapToolsGps: "Lokasi GPS",
  mapToolsGpsBody:
    "Pusatkan peta pada lokasi perangkat Anda dengan izin opt-in eksplisit. Tidak ada pelacakkan samar-samar.",
  mapToolsClustering: "Klasterisasi penanda",
  mapToolsClusteringBody:
    "POI terdekat ditampilkan sebagai penanda klaster yang membesar saat Anda memperbesar.",
  mapToolsLayers: "Kontrol lapisan data",
  mapToolsLayersBody:
    "Aktifkan/nonaktifkan POI OpenStreetMap, bisnis internal LOCIVA, laporan warga, dan lapisan demografi BPS.",
  mapToolsNotMalangOnly: "Tidak terbatas pada Malang",
  mapToolsNotMalangOnlyBody:
    "Peta memuat data berdasarkan viewport dan mendukung penjelajahan di luar Malang — cakupan tergantung pada kontributor OpenStreetMap di setiap wilayah.",
  mapToolsSampleData: "Data contoh — ilustrasi, bukan hasil live.",

  dataTransparencyEyebrow: "Transparansi data",
  dataTransparencyHeadline: "Tahukan dari mana setiap titik data berasal.",
  dataTransparencyBody:
    "Panel analisis menunjukkan berapa banyak POI yang berasal dari OpenStreetMap versus database internal LOCIVA, ditambah cakupan demografi BPS untuk wilayah yang didukung, dengan disclaimer keterbatasan.",
  dataTransparencyOsm: "POI OpenStreetMap",
  dataTransparencyOsmBody:
    "Fasilitas umum dan bisnis dari OpenStreetMap (melalui API milik LOCIVA atas data Geofabrik yang diimpor). Cakupan bervariasi menurut wilayah.",
  dataTransparencyInternal: "Bisnis internal LOCIVA",
  dataTransparencyInternalBody:
    "Bisnis terdaftar yang disimpan dalam database milik LOCIVA, disinkronkan per pengguna.",
  dataTransparencyBps: "Demografi BPS RI",
  dataTransparencyBpsBody:
    "Statistik populasi dan kepadatan resmi dari Badan Pusat Statistik untuk wilayah administratif yang didukung saja.",
  dataTransparencyReports: "Laporan masyarakat",
  dataTransparencyReportsBody:
    "Laporan infrastruktur yang dikirim warga yang digunakan sebagai sinyal kondisi area.",
  dataTransparencySampleData: "Data contoh — ilustrasi, bukan hasil live.",

  invalidLocationEyebrow: "Penanganan lokasi tidak valid",
  invalidLocationHeadline: "Wilayah tidak didukung menunjukkan keadaan jujur.",
  invalidLocationBody:
    "Jika titik kandidat ditempatkan di laut atau area yang tidak didukung, analisis mengembalikan keadaan data tidak mencukupi alih-alih salah score. Koordinat divalidasi terhadap data geospasial nyata sebelum pencadangan.",
  invalidLocationSampleData: "Data contoh — ilustrasi, bukan hasil live.",

  privacyEyebrow: "Prinsip privasi",
  privacyHeadline: "Lokasi Anda tetap milik Anda.",
  privacyBody:
    "Berbagi lokasi langsung hanya opt-in dan berhenti saat Anda menonaktifkannya. Rute pribadi secara default; berbagi memerlukan tindakan eksplisit. Vendor demo diberi label [DEMO] dan bukan pengguna nyata.",
  privacyOptIn: "Berbagi lokasi opt-in",
  privacyOptInBody:
    "Lokasi GPS hanya dibagikan saat Anda secara eksplisit mengaktifkannya dan memberikan izin browser.",
  privacyPrivateRoutes: "Rute pribadi secara default",
  privacyPrivateRoutesBody:
    "Rute tersimpan tidak dibagikan secara publik kecuali Anda secara eksplisit memilih untuk berbagi.",
  privacyNoTracking: "Tidak ada pelacakan real-time",
  privacyNoTrackingBody:
    "Tidak ada siaran lokasi atau pelacakan berkelanjutan pengguna atau pedagang.",
  privacySampleData: "Data contoh — ilustrasi, bukan hasil live.",

  dataSourcesEyebrow: "Sumber data & batasan",
  dataSourcesHeadline: "Sumber data & keterbatasan",
  dataSourcesOsm: "OpenStreetMap",
  dataSourcesOsmBody:
    "Titik minat, jalan, dan penggunaan lahan. Cakupan tergantung pada kontributor lokal dan bervariasi menurut wilayah.",
  dataSourcesOsmrm: "OSRM routing",
  dataSourcesOsmrmBody:
    "Routing jaringan jalan nyata melalui server demo OSRM publik (router.project-osrm.org). Tidak cocok untuk volume traffic produksi.",
  dataSourcesNominatim: "Pencarian Nominatim",
  dataSourcesNominatimBody:
    "Geocoding dan autocomplete tempat melalui Nominatim (OpenStreetMap). Terbatas pada 1 permintaan/detik.",
  dataSourcesCommunity: "Laporan masyarakat",
  dataSourcesCommunityBody:
    "Laporan infrastruktur yang dikirim warga dengan foto dan status verifikasi.",
  dataSourcesLocivaDb: "Database internal LOCIVA",
  dataSourcesLocivaDbBody:
    "Bisnis terdaftar dan POI internal yang disimpan dalam database PostgreSQL milik LOCIVA.",
  dataSourcesBps: "Demografi BPS RI",
  dataSourcesBpsBody:
    "Statistik populasi dan kepadatan resmi dari Badan Pusat Statistik untuk wilayah administratif yang didukung saja (Malang, Bandung, Jakarta, dan kabupaten sekitarnya).",
  dataSourcesLimits: "Keterbatasan",
  dataSourcesLimitsBody:
    "Cakupan OSM bervariasi menurut wilayah dan tidak dapat dianggap lengkap. Skor adalah indeks dukungan keputusan, bukan jaminan pendapatan atau data lalu lintas live. Tidak ada lalu lintas real-time.",
  dataSourcesAttribution:
    "Atribusi: data peta © kontributor OpenStreetMap · routing via OSRM · data BPS melalui Badan Pusat Statistik.",

  // FAQ
  faqEyebrow: "Pertanyaan yang sering diajukan",
  faqHeadline: "Pertanyaan umum tentang LOCIVA",
  faqBody:
    "Jawaban atas pertanyaan paling umum tentang intelijen lokasi, sumber data, dan cara kerja LOCIVA.",

  // Footer
  footerBuilt: "Dibangun untuk keputusan yang lebih baik, satu daerah pada satu waktu.",
  footerPrototype:
    "Model prototipe & demonstrasi · Semua data simulasi untuk demonstrasi konsep.",
  footerLociva: "Lociva",
  footerSubtitle: "Intelijen lokasi & analitik kewargaan",

  // New sections
  vendorRoutesEyebrow: "Rute pedagang keliling",
  vendorRoutesHeadline: "Rencanakan rute penjualan di jalan nyata.",
  vendorRoutesBody:
    "Pedagang keliling dapat merencanakan rute multi-berhenti di sepanjang jaringan jalan OSM nyata, menyimpannya secara pribadi, dan secara opsional membagikannya secara publik. Rute pribadi secara default — berbagi adalah tindakan opt-in eksplisit. Tidak ada pelacakan real-time.",
  vendorRoutesWaypoints: "Titik pengantar",
  vendorRoutesWaypointsBody:
    "Tambah, urut ulang, dan hapus berhenti di sepanjang rute. Klik di peta untuk menempatkan titik pengantar.",
  vendorRoutesRouting: "Routing jalan nyata",
  vendorRoutesRoutingBody:
    "Rute dihitung melalui jaringan jalan OpenStreetMap via OSRM, memberikan jalur nyata yang dapat diemudi/dijalanaki — bukan jarak garis lurus.",
  vendorRoutesSave: "Simpan & bagikan",
  vendorRoutesSaveBody:
    "Simpan rute ke akun Anda. Hapus rute yang tidak lagi diperlukan. Berbagi publik adalah opt-in dan tidak pernah otomatis.",
  vendorRoutesSpotJitu: "Rekomendasi titik jualan spot jitu",
  vendorRoutesSpotJituBody:
    "Dapatkan rekomendasi titik penjualan di dekat fasilitas lalu lintas kaki tinggi (kampus, hub transit, pasar, sekolah) dengan alasan yang ditampilkan dan disclaimer metodologi.",
  vendorRoutesPrivate: "Pribadi secara default · Tidak ada pelacakan real-time",
  vendorRoutesDemoVendors: "Demo vendors",
  vendorRoutesDemoVendorsBody:
    "Vendor contoh dipastikan diberi label [DEMO] dan ditanam melalui API Laravel — mereka bukan pengguna aktif nyata.",
  vendorRoutesSampleData: "Data contoh — ilustrasi, bukan hasil live.",

  savedCandidatesEyebrow: "Kandidat tersimpan & bandingkan",
  savedCandidatesHeadline: "Simpan dan bandingkan lokasi kandidat.",
  savedCandidatesBody:
    "Pin hingga lima titik kandidat di peta, jalankan analisis potensi lokasi untuk masing-masing, dan simpan ke akun Anda. Pilih kandidat mana yang akan dibandingkan berdampingan.",
  savedCandidatesSave: "Simpan kandidat",
  savedCandidatesSaveBody:
    "Simpan secara eksplisit titik kandidat ke database (geser marker tidak auto-save).",
  savedCandidatesCompare: "Bandingkan kandidat",
  savedCandidatesCompareBody:
    "Pilih kandidat mana (A/B/C) yang akan dibandingkan berdampingan menggunakan output analisis nyata.",
  savedCandidatesDelete: "Hapus kandidat tersimpan",
  savedCandidatesDeleteBody:
    "Hapus kandidat tersimpan yang tidak lagi diperlukan, dengan umpan balik sukses/error.",
  savedCandidatesSampleData: "Data contoh — ilustrasi, bukan hasil live.",

  mapToolsEyebrow: "Alat peta interaktif",
  mapToolsHeadline: "Jelajahi peta dengan alat bawaan.",
  mapToolsBody:
    "Cari tempat (Nominatim), beralih antara peta dan basemap satelit, gunakan tombol GPS untuk memusatkan lokasi Anda, lihat penanda POI yang diklusterkontrol, dan kontrol lapisan data.",
  mapToolsSearch: "Pencarian tempat",
  mapToolsSearchBody: "Cari lokasi di seluruh dunia melalui Nominatim (OpenStreetMap).",
  mapToolsBasemap: "Basemap peta / satelit",
  mapToolsBasemapBody: "Beralih antara peta default dan citra satelit.",
  mapToolsGps: "Lokasi GPS",
  mapToolsGpsBody:
    "Pusatkan peta pada lokasi perangkat Anda dengan izin opt-in eksplisit. Tidak ada pelacakkan samar-samar.",
  mapToolsClustering: "Klasterisasi penanda",
  mapToolsClusteringBody:
    "POI terdekat ditampilkan sebagai penanda klaster yang membesar saat Anda memperbesar.",
  mapToolsLayers: "Kontrol lapisan data",
  mapToolsLayersBody:
    "Aktifkan/nonaktifkan POI OpenStreetMap, bisnis internal LOCIVA, laporan warga, dan lapisan demografi BPS.",
  mapToolsNotMalangOnly: "Tidak terbatas pada Malang",
  mapToolsNotMalangOnlyBody:
    "Peta memuat data berdasarkan viewport dan mendukung penjelajahan di luar Malang — cakupan tergantung pada kontributor OpenStreetMap di setiap wilayah.",
  mapToolsSampleData: "Data contoh — ilustrasi, bukan hasil live.",

  dataTransparencyEyebrow: "Transparansi data",
  dataTransparencyHeadline: "Tahukan dari mana setiap titik data berasal.",
  dataTransparencyBody:
    "Panel analisis menunjukkan berapa banyak POI yang berasal dari OpenStreetMap versus database internal LOCIVA, ditambah cakupan demografi BPS untuk wilayah yang didukung, dengan disclaimer keterbatasan.",
  dataTransparencyOsm: "POI OpenStreetMap",
  dataTransparencyOsmBody:
    "Fasilitas umum dan bisnis dari OpenStreetMap (melalui API milik LOCIVA atas data Geofabrik yang diimpor). Cakupan bervariasi menurut wilayah.",
  dataTransparencyInternal: "Bisnis internal LOCIVA",
  dataTransparencyInternalBody:
    "Bisnis terdaftar yang disimpan dalam database milik LOCIVA, disinkronkan per pengguna.",
  dataTransparencyBps: "Demografi BPS RI",
  dataTransparencyBpsBody:
    "Statistik populasi dan kepadatan resmi dari Badan Pusat Statistik untuk wilayah administratif yang didukung saja.",
  dataTransparencyReports: "Laporan masyarakat",
  dataTransparencyReportsBody:
    "Laporan infrastruktur yang dikirim warga yang digunakan sebagai sinyal kondisi area.",
  dataTransparencySampleData: "Data contoh — ilustrasi, bukan hasil live.",

  invalidLocationEyebrow: "Penanganan lokasi tidak valid",
  invalidLocationHeadline: "Wilayah tidak didukung menunjukkan keadaan jujur.",
  invalidLocationBody:
    "Jika titik kandidat ditempatkan di laut atau area yang tidak didukung, analisis mengembalikan keadaan data tidak mencukupi alih-alih salah score. Koordinat divalidasi terhadap data geospasial nyata sebelum pencadangan.",
  invalidLocationSampleData: "Data contoh — ilustrasi, bukan hasil live.",

  privacyEyebrow: "Prinsip privasi",
  privacyHeadline: "Lokasi Anda tetap milik Anda.",
  privacyBody:
    "Berbagi lokasi langsung hanya opt-in dan berhenti saat Anda menonaktifkannya. Rute pribadi secara default; berbagi memerlukan tindakan eksplisit. Vendor demo diberi label [DEMO] dan bukan pengguna nyata.",
  privacyOptIn: "Berbagi lokasi opt-in",
  privacyOptInBody:
    "Lokasi GPS hanya dibagikan saat Anda secara eksplisit mengaktifkannya dan memberikan izin browser.",
  privacyPrivateRoutes: "Rute pribadi secara default",
  privacyPrivateRoutesBody:
    "Rute tersimpan tidak dibagikan secara publik kecuali Anda secara eksplisit memilih untuk berbagi.",
  privacyNoTracking: "Tidak ada pelacakan real-time",
  privacyNoTrackingBody:
    "Tidak ada siaran lokasi atau pelacakan berkelanjutan pengguna atau pedagang.",
  privacySampleData: "Data contoh — ilustrasi, bukan hasil live.",

  dataSourcesEyebrow: "Sumber data & batasan",
  dataSourcesHeadline: "Sumber data & keterbatasan",
  dataSourcesOsm: "OpenStreetMap",
  dataSourcesOsmBody:
    "Titik minat, jalan, dan penggunaan lahan. Cakupan tergantung pada kontributor lokal dan bervariasi menurut wilayah.",
  dataSourcesOsmrm: "OSRM routing",
  dataSourcesOsmrmBody:
    "Routing jaringan jalan nyata melalui server demo OSRM publik (router.project-osrm.org). Tidak cocok untuk volume traffic produksi.",
  dataSourcesNominatim: "Pencarian Nominatim",
  dataSourcesNominatimBody:
    "Geocoding dan autocomplete tempat melalui Nominatim (OpenStreetMap). Terbatas pada 1 permintaan/detik.",
  dataSourcesCommunity: "Laporan masyarakat",
  dataSourcesCommunityBody:
    "Laporan infrastruktur yang dikirim warga dengan foto dan status verifikasi.",
  dataSourcesLocivaDb: "Database internal LOCIVA",
  dataSourcesLocivaDbBody:
    "Bisnis terdaftar dan POI internal yang disimpan dalam database PostgreSQL milik LOCIVA.",
  dataSourcesBps: "Demografi BPS RI",
  dataSourcesBpsBody:
    "Statistik populasi dan kepadatan resmi dari Badan Pusat Statistik untuk wilayah administratif yang didukung saja (Malang, Bandung, Jakarta, dan kabupaten sekitarnya).",
  dataSourcesLimits: "Keterbatasan",
  dataSourcesLimitsBody:
    "Cakupan OSM bervariasi menurut wilayah dan tidak dapat dianggap lengkap. Skor adalah indeks dukungan keputusan, bukan jaminan pendapatan atau data lalu lintas live. Tidak ada lalu lintas real-time.",
  dataSourcesAttribution:
    "Atribusi: data peta © kontributor OpenStreetMap · routing via OSRM · data BPS melalui Badan Pusat Statistik.",
};
