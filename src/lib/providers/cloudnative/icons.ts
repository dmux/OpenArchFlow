import { IconComponent } from '../types';
import { Layers } from 'lucide-react';
import {
    SiKubernetes, SiArgo, SiPrometheus, SiGrafana, SiTerraform, SiHelm, SiIstio, SiDocker,
    SiVault, SiOpentelemetry, SiEnvoyproxy, SiNginx, SiConsul, SiKong, SiCloudflare,
    SiGithubactions, SiGitlab, SiJenkins, SiAnsible, SiPulumi,
    SiDatadog, SiSentry, SiNewrelic, SiDynatrace, SiSplunk, SiElastic, SiKibana, SiLogstash, SiJaeger, SiFluentd,
    SiVercel, SiFlydotio, SiHeroku, SiNetlify,
    SiSupabase, SiPlanetscale, SiTurso, SiNeo4J, SiPostgresql
} from 'react-icons/si';

export const getCloudNativeIcon = (service: string, type: string): IconComponent => {
    const normalizedService = service?.toLowerCase().replace(/\s+/g, '') || '';

    const serviceMap: Record<string, IconComponent> = {
        'kubernetes': SiKubernetes,
        'k8s': SiKubernetes,
        'argocd': SiArgo,
        'argo': SiArgo,
        'crossplane': Layers,
        'prometheus': SiPrometheus,
        'grafana': SiGrafana,
        'terraform': SiTerraform,
        'helm': SiHelm,
        'istio': SiIstio,
        'docker': SiDocker,
        'vault': SiVault,
        'opentelemetry': SiOpentelemetry,
        'envoy': SiEnvoyproxy,
        'nginx': SiNginx,
        'consul': SiConsul,
        'kong': SiKong,
        'cloudflare': SiCloudflare,
        'githubactions': SiGithubactions,
        'gitlab': SiGitlab,
        'jenkins': SiJenkins,
        'ansible': SiAnsible,
        'pulumi': SiPulumi,
        'datadog': SiDatadog,
        'sentry': SiSentry,
        'newrelic': SiNewrelic,
        'dynatrace': SiDynatrace,
        'splunk': SiSplunk,
        'elastic': SiElastic,
        'kibana': SiKibana,
        'logstash': SiLogstash,
        'jaeger': SiJaeger,
        'fluentd': SiFluentd,
        'vercel': SiVercel,
        'flyio': SiFlydotio,
        'heroku': SiHeroku,
        'netlify': SiNetlify,
        'neon': SiPostgresql,
        'supabase': SiSupabase,
        'planetscale': SiPlanetscale,
        'turso': SiTurso,
        'neo4j': SiNeo4J,
    };

    if (serviceMap[normalizedService]) {
        return serviceMap[normalizedService];
    }

    const foundServiceKey = Object.keys(serviceMap).find(key => normalizedService.includes(key));
    if (foundServiceKey) {
        return serviceMap[foundServiceKey];
    }

    return Layers;
};
