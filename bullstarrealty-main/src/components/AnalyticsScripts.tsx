import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCookieConsent } from "./CookieConsent";

interface AnalyticsIntegration {
  id: string;
  provider: string;
  tracking_id: string;
  is_active: boolean;
}

// Provider configuration with script injection logic
const PROVIDER_SCRIPTS: Record<string, (trackingId: string) => void> = {
  google_analytics: (trackingId: string) => {
    // Google Analytics 4
    if (document.querySelector(`script[src*="googletagmanager.com/gtag"]`)) return;
    
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
    document.head.appendChild(script);

    const inlineScript = document.createElement("script");
    inlineScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${trackingId}');
    `;
    document.head.appendChild(inlineScript);
  },

  google_tag_manager: (trackingId: string) => {
    // Google Tag Manager
    if (document.querySelector(`script[src*="googletagmanager.com/gtm"]`)) return;
    
    const script = document.createElement("script");
    script.innerHTML = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${trackingId}');
    `;
    document.head.appendChild(script);
  },

  meta_pixel: (trackingId: string) => {
    // Meta (Facebook) Pixel
    if ((window as any).fbq) return;
    
    const script = document.createElement("script");
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${trackingId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);
  },

  tiktok_pixel: (trackingId: string) => {
    // TikTok Pixel
    if ((window as any).ttq) return;
    
    const script = document.createElement("script");
    script.innerHTML = `
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        ttq.load('${trackingId}');
        ttq.page();
      }(window, document, 'ttq');
    `;
    document.head.appendChild(script);
  },

  linkedin_insight: (trackingId: string) => {
    // LinkedIn Insight Tag
    if ((window as any)._linkedin_data_partner_ids) return;
    
    const script = document.createElement("script");
    script.innerHTML = `
      _linkedin_partner_id = "${trackingId}";
      window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
      window._linkedin_data_partner_ids.push(_linkedin_partner_id);
    `;
    document.head.appendChild(script);

    const script2 = document.createElement("script");
    script2.innerHTML = `
      (function(l) {
        if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
        window.lintrk.q=[]}
        var s = document.getElementsByTagName("script")[0];
        var b = document.createElement("script");
        b.type = "text/javascript";b.async = true;
        b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
        s.parentNode.insertBefore(b, s);})(window.lintrk);
    `;
    document.head.appendChild(script2);
  },

  twitter_pixel: (trackingId: string) => {
    // Twitter/X Pixel
    if ((window as any).twq) return;
    
    const script = document.createElement("script");
    script.innerHTML = `
      !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
      },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
      a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
      twq('config','${trackingId}');
    `;
    document.head.appendChild(script);
  },

  snapchat_pixel: (trackingId: string) => {
    // Snapchat Pixel
    if ((window as any).snaptr) return;
    
    const script = document.createElement("script");
    script.innerHTML = `
      (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
      {a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
      a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
      r.src=n;var u=t.getElementsByTagName(s)[0];
      u.parentNode.insertBefore(r,u);})(window,document,
      'https://sc-static.net/scevent.min.js');
      snaptr('init', '${trackingId}', {});
      snaptr('track', 'PAGE_VIEW');
    `;
    document.head.appendChild(script);
  },

  pinterest_tag: (trackingId: string) => {
    // Pinterest Tag
    if ((window as any).pintrk) return;
    
    const script = document.createElement("script");
    script.innerHTML = `
      !function(e){if(!window.pintrk){window.pintrk = function () {
        window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
        n=window.pintrk;n.queue=[],n.version="3.0";var
        t=document.createElement("script");t.async=!0,t.src=e;var
        r=document.getElementsByTagName("script")[0];
        r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
      pintrk('load', '${trackingId}');
      pintrk('page');
    `;
    document.head.appendChild(script);
  },

  hotjar: (trackingId: string) => {
    // Hotjar
    if ((window as any).hj) return;
    
    const script = document.createElement("script");
    script.innerHTML = `
      (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:${trackingId},hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
      })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
    `;
    document.head.appendChild(script);
  },

  microsoft_clarity: (trackingId: string) => {
    // Microsoft Clarity
    if ((window as any).clarity) return;
    
    const script = document.createElement("script");
    script.innerHTML = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${trackingId}");
    `;
    document.head.appendChild(script);
  },

  hubspot: (trackingId: string) => {
    // HubSpot Tracking Code
    if (document.querySelector(`script[src*="js.hs-scripts.com"]`)) return;
    
    const script = document.createElement("script");
    script.id = "hs-script-loader";
    script.async = true;
    script.defer = true;
    script.src = `//js.hs-scripts.com/${trackingId}.js`;
    document.head.appendChild(script);
  },

  intercom: (trackingId: string) => {
    // Intercom
    if ((window as any).Intercom) return;
    
    const script = document.createElement("script");
    script.innerHTML = `
      window.intercomSettings = {
        api_base: "https://api-iam.intercom.io",
        app_id: "${trackingId}"
      };
      (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/${trackingId}';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();
    `;
    document.head.appendChild(script);
  },
};

// Mapping of analytics vs marketing providers
const ANALYTICS_PROVIDERS = ["google_analytics", "google_tag_manager", "hotjar", "microsoft_clarity", "hubspot"];
const MARKETING_PROVIDERS = ["meta_pixel", "tiktok_pixel", "linkedin_insight", "twitter_pixel", "snapchat_pixel", "pinterest_tag", "intercom"];

export function AnalyticsScripts() {
  const [integrations, setIntegrations] = useState<AnalyticsIntegration[]>([]);
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    // Check initial consent
    const consent = getCookieConsent();
    if (consent && (consent.analytics || consent.marketing)) {
      setConsentGiven(true);
      fetchAndLoadIntegrations(consent);
    }

    // Listen for consent changes
    const handleConsent = (event: CustomEvent) => {
      setConsentGiven(true);
      fetchAndLoadIntegrations(event.detail);
    };

    window.addEventListener("cookie-consent-given", handleConsent as EventListener);
    return () => {
      window.removeEventListener("cookie-consent-given", handleConsent as EventListener);
    };
  }, []);

  const fetchAndLoadIntegrations = async (consent: { analytics: boolean; marketing: boolean }) => {
    try {
      const { data, error } = await supabase
        .from("analytics_integrations")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;

      const activeIntegrations = (data as AnalyticsIntegration[]) || [];
      setIntegrations(activeIntegrations);

      // Load scripts based on consent
      activeIntegrations.forEach((integration) => {
        const isAnalytics = ANALYTICS_PROVIDERS.includes(integration.provider);
        const isMarketing = MARKETING_PROVIDERS.includes(integration.provider);

        if ((isAnalytics && consent.analytics) || (isMarketing && consent.marketing)) {
          const loadScript = PROVIDER_SCRIPTS[integration.provider];
          if (loadScript) {
            loadScript(integration.tracking_id);
          }
        }
      });
    } catch (error) {
      console.error("Error loading analytics integrations:", error);
    }
  };

  // This component doesn't render anything visible
  return null;
}
