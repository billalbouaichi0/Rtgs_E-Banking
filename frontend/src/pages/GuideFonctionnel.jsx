import React, { useState } from 'react';
import { 
  BookOpen, 
  Building2, 
  Layers, 
  Clock, 
  Send, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  ArrowRight, 
  Copy, 
  Check, 
  AlertCircle,
  HelpCircle,
  FolderGit2,
  Mail,
  Zap,
  DollarSign,
  TrendingUp,
  Database
} from 'lucide-react';

export const GuideFonctionnel = () => {
  const [copiedSection, setCopiedSection] = useState(null);

  const copyCode = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sampleEdi = `VIRM0050100100500133400218153023DZ00ENTREPRISE NATIONALE INDUSTRIELLE                  12 BOULEVARD DES MARTYRS ALGER                       202609140010000020000000823735800                               
0000010207100806001906006101410DZ00SARL TECH LOGISTICS ALGERIE                       ZONE INDUSTRIELLE OUED SMAR ALGER                    000000243735800VIR FACTURE RTGS MATERIEL INFORMATIQUE ET RESEAUX                     
00000102081003010012012345678900DZ00GROUPE AGROALIMENTAIRE DU SUD                     CITE 500 LOGEMENTS OUARGLA                           000000580000000REGLEMENT IMPORT CEREALES ET FARINE BLANCHE                            
FVIR                                                                                                `;

  const sampleOd = `005001330013340021815300000000243735800DZD-VIR-0000010207-20260914-120000                        
005001330013340021815300000000580000000DZD-VIR-0000010208-20260914-120000                        `;

  const sampleSwift = `{1:F01BDLODZALXXX0000000000}{2:I103BALGDZALXXXXN}{3:{103:DLP}}{4:
:20:0000010207
:23B:CRED
:23E:SDVA
:32A:260914DZD2437358,00
:50K:/00500133400218153023
ENTREPRISE NATIONALE INDUSTRIELLE
12 BOULEVARD DES MARTYRS
ALGER
:53A:/9711000005
BDLODZALXXX
:57A:/9711000008
SGENALAGXXX
:59:/00806001906006101410
SARL TECH LOGISTICS ALGERIE
ZONE INDUSTRIELLE OUED SMAR
ALGER
:70:VIR FACTURE RTGS MATERIEL INFORMATIQUE
:71A:SHA
:72:/CODTYPTR/001
-}`;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#772281] via-[#521759] to-[#0f172a] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-[#772281]/40">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <BookOpen className="w-80 h-80 text-white" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f9b307]/20 border border-[#f9b307]/40 text-[#f9b307] text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Manuel Métier & Fonctionnel Officiel
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Guide Fonctionnel — BDL RTGS E-Banking
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
            Comprendre de A à Z les règles de télécompensation RTGS, le cycle d'ingestion EDI, l'ordonnancement des débits par lots (OD), la vérification Core Banking SAB et le routage automatisé vers les structures DCC, DTM et DMB.
          </p>
        </div>
      </div>

      {/* 1. Contexte & Enjeux Métier */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-[#772281]/10 text-[#772281] dark:text-[#f9b307]">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              1. Contexte Bancaire & Règles d'Éligibilité RTGS
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Système de règlement brut en temps réel de la Banque d'Algérie
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#772281] dark:text-[#f9b307]">
              <DollarSign className="w-4 h-4" /> Seuil Minimum
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">≥ 1 000 000 DZD</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Tout ordre inférieur à ce seuil est filtré et dirigé vers la télécompensation classique de masse (statut <code className="font-mono font-bold text-slate-500">IGNORE_FILTRE</code>).
            </p>
          </div>

          <div className="p-5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
              <Zap className="w-4 h-4" /> Nature du Virement
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">Interbancaire</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Le code banque du donneur d'ordre (<code className="font-mono font-bold">005</code> BDL) doit être différent du code banque récepteur (001 à 017 hors 005).
            </p>
          </div>

          <div className="p-5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> Contrôle Provision
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">Core Banking SAB</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Le solde disponible en Dinars Algériens (DZD) est contrôlé en direct sur la base Oracle 11g avant toute génération de débit.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Les 3 Structures BDL Destinataires */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              2. Les 3 Directions Centrales BDL & Matrice de Routage
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rôle de chaque structure et flux de sortie associés
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* DCC */}
          <div className="rounded-2xl border border-[#772281]/30 p-6 bg-gradient-to-b from-[#772281]/5 to-transparent space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#772281] text-white">
                STRUCTURE DCC
              </span>
              <Mail className="w-4 h-4 text-[#772281]" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Direction de la Comptabilité & du Contrôle
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Reçoit automatiquement le fichier de lot des <strong>Opérations Diverses (OD)</strong> regroupant l'ensemble des débits validés.
            </p>
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
              <p><strong className="text-slate-700 dark:text-slate-200">Fichier :</strong> <code className="font-mono text-[#772281] dark:text-[#f9b307]">ZCPTODA9_*.dat</code></p>
              <p><strong className="text-slate-700 dark:text-slate-200">Format :</strong> 98 positions normé BDL</p>
              <p><strong className="text-slate-700 dark:text-slate-200">Pièce jointe :</strong> Oui (Fichier complet .dat)</p>
            </div>
          </div>

          {/* DTM */}
          <div className="rounded-2xl border border-emerald-500/30 p-6 bg-gradient-to-b from-emerald-500/5 to-transparent space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white">
                STRUCTURE DTM
              </span>
              <Mail className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Direction de la Trésorerie & des Marchés
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Reçoit les messages normés <strong>SWIFT MT103</strong> dès confirmation de comptabilisation par le Core Banking SAB.
            </p>
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
              <p><strong className="text-slate-700 dark:text-slate-200">Fichier :</strong> <code className="font-mono text-emerald-600 dark:text-emerald-400">MT103_*.txt</code></p>
              <p><strong className="text-slate-700 dark:text-slate-200">Format :</strong> Norme SWIFT MT103 interbancaire</p>
              <p><strong className="text-slate-700 dark:text-slate-200">Pièce jointe :</strong> Oui (Message .txt)</p>
            </div>
          </div>

          {/* DMB */}
          <div className="rounded-2xl border border-blue-500/30 p-6 bg-gradient-to-b from-blue-500/5 to-transparent space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-600 text-white">
                STRUCTURE DMB
              </span>
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Direction Monétique & e-Banking
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Reçoit les accusés de traitement <strong>SI Retour</strong> : soit les avis de rejet (solde, doublon, SAB) soit l'avis de comptabilisation.
            </p>
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
              <p><strong className="text-slate-700 dark:text-slate-200">Fichier :</strong> <code className="font-mono text-blue-600 dark:text-blue-400">SI_VIR_RJT_*.txt / SI_VIR_CPT_*.txt</code></p>
              <p><strong className="text-slate-700 dark:text-slate-200">Format :</strong> Norme SI Retour BDL</p>
              <p><strong className="text-slate-700 dark:text-slate-200">Pièce jointe :</strong> Oui (Accusé .txt)</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Cycle de Vie Détaillé en 3 Étapes */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-8">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              3. Le Cycle de Vie Opérationnel en 3 Étapes
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Déroulement séquentiel et automatisé de bout en bout
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Étape 1 */}
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#772281] text-white text-xs font-black">
                1
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Étape 1 : Réception EDI & Rétention dans le Répertoire Source
              </h3>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 leading-relaxed pl-10 list-disc">
              <li>
                <strong>Dépôt du fichier :</strong> Le client ou l'application amont dépose une remise EDI (<code className="font-mono">VIRMNE_*.edi</code>) dans le répertoire <code className="font-mono text-[#772281] dark:text-[#f9b307]">source/</code> (surveillance locale Chokidar ou synchronisation FTP/SFTP).
              </li>
              <li>
                <strong>Rétention Intégrale :</strong> Le fichier déposé n'est <strong>jamais supprimé</strong> du dossier source. Son empreinte MD5/SHA-256 et son nom sont indexés en base de données pour empêcher toute double ingestion.
              </li>
              <li>
                <strong>Attribution du statut :</strong> Les virements éligibles (Interbancaire ≥ 1M DZD) reçoivent le statut initial <span className="px-2 py-0.5 rounded font-bold bg-blue-500/20 text-blue-600 dark:text-blue-400">RECU</span> (En attente du créneau de lot OD).
              </li>
            </ul>
          </div>

          {/* Étape 2 */}
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-slate-900 text-xs font-black">
                2
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Étape 2 : Planification des Lots OD & Contrôle Solde SAB (Heures Fixes)
              </h3>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 leading-relaxed pl-10 list-disc">
              <li>
                <strong>Déclenchement programmé :</strong> À chaque heure paramétrée (ex: <code className="font-mono">12:00, 15:00, 16:30</code>), le planificateur analyse tous les virements au statut <code className="font-mono">RECU</code>.
              </li>
              <li>
                <strong>Vérification synchrone du solde :</strong> Requêtage direct sur <code className="font-mono">sabstd.zcompte0</code> et <code className="font-mono">sabstd.zsolde0</code> sur le compte donneur à 15 positions.
              </li>
              <li>
                <strong>❌ Si Solde Insuffisant :</strong> Rejet automatique immédiat (<span className="px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400">REJETE</span>). Génération du fichier <code className="font-mono text-rose-600">SI_VIR_RJT_*.txt</code> dans <code className="font-mono">si_retour/</code> et notification email automatique à la <strong>Structure DMB</strong>.
              </li>
              <li>
                <strong>✅ Si Solde Suffisant :</strong> Statut <span className="px-2 py-0.5 rounded font-bold bg-purple-500/20 text-purple-600 dark:text-purple-400">OD_GEN</span>. Génération du fichier lot global <code className="font-mono text-[#772281] dark:text-[#f9b307]">ZCPTODA9_YYYYMMDD_HHMMSS.dat</code> dans <code className="font-mono">generated_od/</code> et notification email à la <strong>Structure DCC</strong> avec pièce jointe.
              </li>
            </ul>
          </div>

          {/* Étape 3 */}
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black">
                3
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Étape 3 : Polling SAB & Télécompensation SWIFT MT103 (Toutes les 5 min)
              </h3>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 leading-relaxed pl-10 list-disc">
              <li>
                <strong>Surveillance périodique :</strong> Le service vérifie la table <code className="font-mono">sabstd.zcptod0</code> pour les virements aux statuts <code className="font-mono">OD_GEN</code> ou <code className="font-mono">INTEGRE</code> via la clé d'unicité <code className="font-mono">CPTODLI2</code>.
              </li>
              <li>
                <strong>CPTODETA = '001' (DCO = 0) :</strong> Statut <span className="px-2 py-0.5 rounded font-bold bg-blue-500/20 text-blue-600 dark:text-blue-400">INTEGRE</span>. L'opération est prise en charge par le SAB.
              </li>
              <li>
                <strong>CPTODETA = '003' (DCO ≠ 0) :</strong> Opération COMPTABILISÉE ! Passage au statut <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">ENVOYE</span>.
                <div className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-500/20 space-y-1">
                  <p>1. Génération du message <strong>SWIFT MT103</strong> (<code className="font-mono">MT103_*.txt</code>) ➔ Email à la <strong>Structure DTM</strong>.</p>
                  <p>2. Génération de l'accusé <strong>SI Retour Comptabilisé</strong> (<code className="font-mono">SI_VIR_CPT_*.txt</code>) ➔ Email à la <strong>Structure DMB</strong>.</p>
                </div>
              </li>
              <li>
                <strong>CPTODETA = '002' :</strong> Rejet comptable SAB ➔ Statut <code className="font-mono">REJETE</code>, génération du fichier <code className="font-mono">SI_VIR_RJT_*.txt</code> et email à la <strong>Structure DMB</strong>.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Formats des Fichiers avec Code & Copie */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-[#772281] dark:text-[#f9b307]">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              4. Échantillons & Formats des Fichiers Échangés
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Structures exactes des données transmises et reçues
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* EDI Example */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                A. Fichier EDI Entrant (Entête EE + Corps EC + Fin EF)
              </span>
              <button
                onClick={() => copyCode(sampleEdi, 'edi')}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                {copiedSection === 'edi' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'edi' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 text-[11px] font-mono overflow-x-auto border border-slate-800">
              {sampleEdi}
            </pre>
          </div>

          {/* OD Example */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                B. Fichier Lot OD Débit (ZCPTODA9_*.dat — 98 positions par ligne)
              </span>
              <button
                onClick={() => copyCode(sampleOd, 'od')}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                {copiedSection === 'od' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'od' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 text-[11px] font-mono overflow-x-auto border border-slate-800">
              {sampleOd}
            </pre>
          </div>

          {/* SWIFT MT103 Example */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                C. Message SWIFT MT103 (Norme SWIFT RTGS)
              </span>
              <button
                onClick={() => copyCode(sampleSwift, 'swift')}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                {copiedSection === 'swift' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'swift' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 text-[11px] font-mono overflow-x-auto border border-slate-800">
              {sampleSwift}
            </pre>
          </div>
        </div>
      </section>

      {/* 5. Matrice des Statuts */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              5. Matrice des 7 Statuts de Virement
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Signification de chaque état affiché dans l'application
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
                <th className="py-3 px-3">Code Statut</th>
                <th className="py-3 px-3">Libellé Affiché</th>
                <th className="py-3 px-3">Description Métier & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-3 px-3 font-mono font-bold text-blue-500">RECU</td>
                <td className="py-3 px-3 font-bold">En attente Lot OD</td>
                <td className="py-3 px-3">Virement éligible extrait de la remise EDI. En attente de l'heure programmée de lot OD.</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-mono font-bold text-purple-500">OD_GEN</td>
                <td className="py-3 px-3 font-bold">Lot OD Généré</td>
                <td className="py-3 px-3">Solde suffisant vérifié sur SAB. Inclus dans <code className="font-mono">ZCPTODA9_*.dat</code>. Email envoyé à la DCC.</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-mono font-bold text-blue-400">INTEGRE</td>
                <td className="py-3 px-3 font-bold">Intégré SAB (001)</td>
                <td className="py-3 px-3">Opération prise en charge par le Core Banking SAB (CPTODETA='001'). En attente de validation comptable.</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-mono font-bold text-emerald-500">ENVOYE</td>
                <td className="py-3 px-3 font-bold">Comptabilisé & Envoyé</td>
                <td className="py-3 px-3">Opération comptabilisée par SAB (CPTODETA='003', N° DCO affecté). SWIFT MT103 émis vers la DTM.</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-mono font-bold text-rose-500">REJETE</td>
                <td className="py-3 px-3 font-bold">Rejeté</td>
                <td className="py-3 px-3">Rejet automatique pour solde insuffisant ou rejet comptable SAB (002). Fichier <code className="font-mono">SI_VIR_RJT</code> transmis à la DMB.</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-mono font-bold text-slate-400">IGNORE_FILTRE</td>
                <td className="py-3 px-3 font-bold">Filtré / Non RTGS</td>
                <td className="py-3 px-3">Montant &lt; 1 000 000 DZD ou virement interne BDL vers BDL (005 vers 005).</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-mono font-bold text-amber-500">REJETE_DOUBLON</td>
                <td className="py-3 px-3 font-bold">Rejeté (Doublon)</td>
                <td className="py-3 px-3">Rejet pour détection de doublon (même libellé, même bénéficiaire dans la remise ou en base).</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default GuideFonctionnel;
