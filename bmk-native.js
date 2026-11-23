(() => {
    if (!document.getElementById("bmk-native-styles")) {
        const st = document.createElement("style");
        st.id = "bmk-native-styles";
        st.textContent = `\n      \n      .native-task-strip{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:0 0 24px}\n      .task-strip-item{margin:0;min-width:0}\n      .task-strip-item a{display:block;border-radius:8px;overflow:hidden;border:1px solid #dcded8;background:#f4f4f2}\n      .task-strip-item img{display:block;width:100%;aspect-ratio:3/2;object-fit:cover;transition:transform .25s ease}\n      .task-strip-item a:hover img{transform:scale(1.03)}\n      .task-strip-item figcaption{margin-top:6px;font-size:11px;line-height:1.4;color:#666;text-align:center}\n\n      \n      .native-bmk-wrap{margin-top:18px;padding-top:18px;border-top:1px solid var(--line)}\n      .bmk-col-headers{display:grid!important;gap:12px;margin-bottom:12px}\n      .bmk-col-headers.cols-3,.bmk-row.cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}\n      .bmk-col-headers.cols-4,.bmk-row.cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}\n      .bmk-col-headers.cols-5,.bmk-row.cols-5{grid-template-columns:repeat(5,minmax(0,1fr))}\n      .bmk-col-hdr{padding:8px 10px;border-radius:6px;background:#f4f4f2;color:#4a5550;font-size:12.5px;font-weight:600;text-align:center}\n      .bmk-col-hdr.is-ours{background:#d6efe9;color:#193c32;border:1px solid #b5dfd4}\n      .bmk-rows{display:grid!important;gap:12px}\n      .bmk-row{display:grid!important;gap:12px;align-items:stretch;opacity:1;transition:opacity .3s ease}\n      .bmk-cell{position:relative;display:block;width:100%;border-radius:8px;overflow:hidden;border:1px solid #deded9;background:#f4f4f2;aspect-ratio:16/10;min-width:0}\n      .cols-5 .bmk-cell{aspect-ratio:3/2}\n      .bmk-cell.is-ours{border-color:#7bc4b4;box-shadow:0 2px 10px rgba(55,124,109,.08)}\n      .bmk-cell.is-white{background:#fff}\n      .bmk-cell.is-white img{object-fit:contain;padding:6px}\n      .bmk-cell.is-dark{background:#000}\n      .bmk-cell.is-dark img{object-fit:contain;padding:6px}\n      .bmk-cell>img{display:block;width:100%;height:100%;object-fit:contain}\n      .native-bmk-wrap[data-benchmark="bg"] .bmk-cell,.native-bmk-wrap[data-benchmark="p3d"] .bmk-cell{aspect-ratio:1}\n      .native-bmk-wrap[data-benchmark="3dc"] .bmk-cell{aspect-ratio:4/3}\n      .bmk-prompt-card{display:flex!important;flex-direction:column;justify-content:center;padding:14px 16px;background:#f7f8f6}\n      .bmk-p-tag{font:10px/1.3 ui-monospace,SFMono-Regular,monospace;color:var(--green);letter-spacing:.04em;margin-bottom:5px}\n      .bmk-prompt-card h4,.bmk-split-text h4{margin:0 0 5px;font-size:13.5px;font-weight:600;color:var(--ink)}\n      .bmk-prompt-card p,.bmk-split-text p{margin:0;font-size:11.5px;line-height:1.58;color:#555}\n      .bmk-split-card{display:grid!important;grid-template-columns:1.15fr .85fr;background:#f7f8f6}\n      .bmk-split-text{padding:12px 12px 12px 14px;display:flex;flex-direction:column;justify-content:center;min-width:0}\n      .bmk-split-gt{display:flex;align-items:center;justify-content:center;margin:7px 7px 7px 0;border-radius:6px;background:#000;overflow:hidden}\n      .bmk-split-gt img{width:100%;height:100%;object-fit:contain;padding:4px}\n      .bmk-matrix-note{margin:14px 0 0;padding-top:12px;border-top:1px solid #ebece8;font-size:12px;color:#777}\n\n      \n      .traj-player{margin-top:0;padding-top:0;border-top:0}\n      .traj-top-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:8px 12px;border-radius:10px;background:#f4f5f3;border:1px solid #deded9;margin-bottom:14px;flex-wrap:wrap}\n      .traj-anchor-chip{display:flex;align-items:center;gap:12px;min-width:0}\n      .traj-anchor-thumb{display:block;width:60px;aspect-ratio:16/10;border-radius:6px;overflow:hidden;border:1px solid #ccc;flex-shrink:0;background:#fff}\n      .traj-anchor-thumb img{display:block;width:100%;height:100%;object-fit:cover}\n      .traj-anchor-meta{min-width:0}\n      .traj-anchor-meta span{display:block;font:600 9.5px/1.3 ui-monospace,monospace;color:#377c6d;letter-spacing:.06em}\n      .traj-anchor-meta strong{display:block;font-size:13.5px;font-weight:600;color:#1a1a1a;margin-top:1px}\n\n      .traj-controls{display:flex;align-items:center;justify-content:flex-end;flex:1;min-width:300px}\n      .traj-player .traj-top-bar .traj-steps-bar{display:inline-flex;align-items:center;gap:3px;background:#e6ece9;padding:3px;border-radius:7px;border:1px solid #d8e2dd}\n      .traj-player .traj-top-bar .traj-steps-bar button.traj-play-btn{width:32px;height:26px;padding:0;border-radius:6px!important;border:0!important;background:transparent!important;color:#213c34;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s,color .15s}\n      .traj-player .traj-top-bar .traj-steps-bar button.traj-play-btn:hover{background:#d4e5df!important;color:#193c32}\n      .traj-player .traj-top-bar .traj-steps-bar button.traj-play-btn.is-paused{color:#377c6d}\n      .traj-play-btn svg{width:11px;height:11px;display:block}\n      .traj-player .traj-top-bar .traj-steps-bar button.traj-step-btn{min-width:44px;height:26px;padding:0 7px;border:0!important;border-radius:5px;background:transparent;color:#5a6660;font:600 11px/1 ui-monospace,monospace;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .18s,color .18s}\n      .traj-player .traj-top-bar .traj-steps-bar button.traj-step-btn:hover{background:#d4e5df;color:#193c32}\n      .traj-player .traj-top-bar .traj-steps-bar button.traj-step-btn.active{background:#fff;color:#18382e;box-shadow:0 1px 2px rgba(0,0,0,.06)}\n      .traj-player .traj-top-bar .traj-steps-bar button.traj-step-btn.is-phase2.active{background:#fff;color:#18382e}\n\n      .traj-dual-stage{display:grid!important;grid-template-columns:1fr 1fr;gap:18px;align-items:stretch}\n      .traj-viewport-card{display:flex;flex-direction:column;border-radius:10px;overflow:hidden;border:1px solid #deded9;background:#fafaf8}\n      .traj-viewport-card.is-ours{border-color:#7bc4b4;background:#f2faf7;box-shadow:0 6px 24px -14px rgba(55,124,109,.22)}\n      .traj-vp-header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-bottom:1px solid #e5e6e1;background:#fff}\n      .traj-viewport-card.is-ours .traj-vp-header{background:#d6efe9;border-bottom-color:#b8dfd5}\n      .traj-vp-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#1a1a1a}\n      .traj-viewport-card.is-ours .traj-vp-title{color:#16382e}\n      .traj-vp-stats{display:flex;align-items:center;gap:8px;font:11.5px/1.3 ui-monospace,monospace;color:#666}\n      .traj-vp-score{padding:3px 8px;border-radius:4px;background:#eaece9;color:#333;font-weight:600}\n      .traj-viewport-card.is-ours .traj-vp-score{background:#213c34;color:#a4e7da}\n\n      .traj-canvas{position:relative;width:100%;aspect-ratio:16/9;background:#e8ecea;overflow:hidden}\n      .traj-canvas a{position:absolute;inset:0;display:block;opacity:0;pointer-events:none;transition:opacity .65s cubic-bezier(.22,1,.36,1)}\n      .traj-canvas a.is-active{opacity:1;pointer-events:auto;z-index:1}\n      .traj-canvas img{display:block;width:100%;height:100%;object-fit:cover}\n      .traj-early-stop{position:absolute;right:12px;bottom:12px;z-index:2;padding:5px 10px;border-radius:6px;background:rgba(26,26,26,.82);color:#f3d29c;font-size:11.5px;font-weight:500;backdrop-filter:blur(6px);opacity:0;transform:translateY(4px);transition:opacity .35s ease,transform .35s ease;pointer-events:none}\n      .traj-early-stop.is-visible{opacity:1;transform:none}\n\n      .traj-vp-footer{padding:9px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12.5px;color:#4e5a54;min-height:38px;background:#fafaf8}\n      .traj-viewport-card.is-ours .traj-vp-footer{background:#f2faf7}\n      .traj-vp-desc{font-weight:500;color:#222}\n      .traj-viewport-card.is-ours .traj-vp-desc{color:#16382e;font-weight:600}\n      .traj-vp-meta{padding:2px 8px;border-radius:4px;background:#d6efe9;color:#16382e;font-size:11px;font-weight:600;white-space:nowrap}\n\n      \n      .code-scene-tabs{display:inline-flex;gap:4px;padding:3px;border-radius:7px;background:#e7ece9;border:1px solid #d5dfd9}\n      .code-scene-tabs button{padding:5px 11px;border:0;border-radius:5px;background:transparent;color:#54665e;font:500 12px/1.35 system-ui,-apple-system,'PingFang SC',sans-serif}\n      .code-scene-tabs button.active{background:#fff;color:#18352c;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.08)}\n      .code-fig-footer{grid-row:3;grid-column:1;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;background:#f4f4f2;border-top:1px solid #e7e9ed}\n      .code-view-switch{display:inline-flex;gap:4px;padding:3px;border-radius:6px;background:#e6ece9}\n      .code-view-switch button{padding:4px 10px;border:0;border-radius:4px;background:transparent;color:#586b63;font-size:11.5px;font-weight:500}\n      .code-view-switch button.active{background:#fff;color:#1b3c32;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.06)}\n\n      @media(max-width:950px){.native-task-strip{grid-template-columns:repeat(3,minmax(0,1fr))}.traj-dual-stage{grid-template-columns:1fr}.traj-controls{width:100%;justify-content:space-between}}\n      @media(max-width:700px){.native-task-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.bmk-col-headers{display:none!important}.bmk-row.cols-4,.bmk-row.cols-5{grid-template-columns:repeat(2,minmax(0,1fr))}.traj-steps-bar,.traj-filmstrip{grid-template-columns:repeat(5,minmax(0,1fr))}}\n\n      \n      .pipe-native-board{padding:24px 28px;background:#fff;border-top:1px solid var(--line);display:grid;gap:22px}\n      .pipe-subband{border:1px solid #deded9;border-radius:10px;background:#fafaf8;padding:18px 20px}\n      .pipe-subband-hdr{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #eaeae5}\n      .pipe-subband-hdr strong{font-size:14px;font-weight:600;color:#1a1a1a;display:flex;align-items:center;gap:8px}\n      .pipe-subband-hdr strong i{font:600 10.5px/1 ui-monospace,monospace;padding:3px 7px;border-radius:4px;background:#d6efe9;color:#193c32;font-style:normal}\n      .pipe-subband-hdr span{font-size:12px;color:#666}\n\n      \n      .pipe-ref-flow{display:grid;grid-template-columns:1fr auto 1.15fr auto 1fr auto 1.25fr auto 1.35fr;gap:10px;align-items:stretch}\n      .pipe-arrow{display:flex;align-items:center;justify-content:center;color:#7a8b84;font:600 16px/1 system-ui;user-select:none}\n      .pipe-node{background:#fff;border:1px solid #e1e3dd;border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;min-width:0}\n      .pipe-node-title{font-size:12.5px;font-weight:600;color:#1a1a1a;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:6px}\n      .pipe-node-title small{font:500 10.5px ui-monospace,monospace;color:#657b72}\n      .pipe-hist-svg{width:100%;height:54px;display:block;margin:4px 0}\n      .pipe-node-foot{font-size:11px;color:#666;margin-top:6px;line-height:1.4}\n      .pipe-stack-list{display:grid;gap:6px;margin:auto 0}\n      .pipe-stack-item{display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:6px;background:#f4f5f3;font-size:11.5px;color:#2c3632;font-weight:500}\n      .pipe-stack-item b{flex-shrink:0;white-space:nowrap;font:600 10px ui-monospace,monospace;color:#377c6d;background:#e3f2ee;padding:2px 5px;border-radius:4px}\n      .pipe-anchor-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px}\n      .pipe-anchor-main{grid-column:1/-1;position:relative;border-radius:6px;overflow:hidden;border:1.5px solid #377c6d;aspect-ratio:16/9}\n      .pipe-anchor-main img,.pipe-anchor-rej img{display:block;width:100%;height:100%;object-fit:cover}\n      .pipe-anchor-badge{position:absolute;top:5px;left:5px;padding:2px 6px;border-radius:4px;background:rgba(25,60,50,.88);color:#a4e7da;font:600 10px/1.2 ui-monospace,monospace}\n      .pipe-anchor-rej{position:relative;border-radius:5px;overflow:hidden;border:1px solid #d9b8b4;aspect-ratio:16/10;opacity:.88}\n      .pipe-anchor-rej span{position:absolute;inset:auto 0 0;background:rgba(140,45,35,.82);color:#fff;font-size:9.5px;text-align:center;padding:1px 4px}\n\n      \n      .pipe-task-flow{display:grid;grid-template-columns:1.15fr auto 1.35fr auto .95fr;gap:12px;align-items:stretch}\n      .pipe-csf-stack{display:grid;gap:8px}\n      .pipe-csf-card{display:grid;grid-template-columns:56px 1fr;gap:10px;align-items:center;padding:9px 12px;background:#fff;border:1px solid #e1e3dd;border-radius:8px}\n      .pipe-csf-thumb{width:56px;height:42px;border-radius:5px;overflow:hidden;background:#eef3f1;border:1px solid #d5e0dc;display:grid;place-items:center;font:600 11px ui-monospace,monospace;color:#2b5f53}\n      .pipe-csf-thumb img{width:100%;height:100%;object-fit:cover;display:block}\n      .pipe-csf-card h5{margin:0 0 2px;font-size:12.5px;font-weight:600;color:#1a1a1a}\n      .pipe-csf-card h5 em{font-style:normal;color:#377c6d;font-family:ui-monospace,monospace;font-size:11.5px}\n      .pipe-csf-card p{margin:0;font-size:11px;color:#666;line-height:1.45}\n\n      .pipe-rubric-card{background:#fff;border:1px solid #b8dfd5;border-radius:8px;padding:14px 16px;display:flex;flex-direction:column;justify-content:space-between}\n      .pipe-rubric-top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:9px;border-bottom:1px solid #e6ece9;margin-bottom:8px}\n      .pipe-rubric-top strong{font-size:13px;color:#16382e}\n      .pipe-tier-pills{display:flex;gap:4px}\n      .pipe-tier-pills span{padding:2px 7px;border-radius:4px;font:600 10.5px ui-monospace,monospace}\n      .pipe-tier-0{background:#f5ebe9;color:#9e3f33}\n      .pipe-tier-05{background:#f7f0e4;color:#8c5e1a}\n      .pipe-tier-1{background:#d6efe9;color:#193c32}\n      .pipe-rubric-rows{display:grid;gap:7px}\n      .pipe-rubric-row{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding-bottom:6px;border-bottom:1px solid #f0f2ef;font-size:11.5px}\n      .pipe-rubric-row:last-child{border-bottom:0;padding-bottom:0}\n      .pipe-rubric-row b{color:#1a1a1a;font-weight:600;white-space:nowrap}\n      .pipe-rubric-row b i{font-style:normal;color:#377c6d;font-family:ui-monospace,monospace;font-size:10.5px}\n      .pipe-rubric-row span{color:#666;font-size:11px;text-align:right}\n\n      .pipe-pkg-card{background:#f2faf7;border:1px solid #b8dfd5;border-radius:8px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;gap:8px}\n      .pipe-pkg-badge{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;color:#193c32;background:#d6efe9;padding:4px 9px;border-radius:5px;align-self:flex-start}\n      .pipe-pkg-box{background:#fff;border:1px solid #cfe5de;border-radius:6px;padding:9px 11px}\n      .pipe-pkg-box small{display:block;font:600 10px ui-monospace,monospace;color:#54746a}\n      .pipe-pkg-box strong{display:block;font-size:12px;color:#1a1a1a;margin-top:2px}\n\n      \n      .pipe-rollout-grid{display:grid;grid-template-columns:1.05fr 1.05fr 1.35fr 1fr;gap:14px;padding:24px 28px;background:#fff;border-top:1px solid var(--line);align-items:stretch}\n      .pipe-stage-col{border:1px solid #deded9;border-radius:10px;background:#fafaf8;padding:16px;display:flex;flex-direction:column;justify-content:space-between;gap:12px;min-width:0}\n      .pipe-stage-col.is-highlight{background:#f2faf7;border-color:#9fd6c8}\n      .pipe-col-hdr{border-bottom:1px solid #e6e8e3;padding-bottom:10px}\n      .pipe-col-hdr span{display:block;font:600 10px/1.2 ui-monospace,monospace;color:#377c6d;letter-spacing:.06em}\n      .pipe-col-hdr h4{margin:4px 0 0;font-size:14px;font-weight:600;color:#1a1a1a}\n      .pipe-white-box{background:#fff;border:1px solid #e2e5e0;border-radius:8px;padding:11px 12px}\n      .pipe-white-box h5{margin:0 0 6px;font-size:12px;font-weight:600;color:#1a1a1a;display:flex;align-items:center;justify-content:space-between;gap:6px;white-space:nowrap}\n      .pipe-white-box h5 small{font:500 10px ui-monospace,monospace;color:#657b72}\n      .pipe-tool-list{list-style:none;margin:0;padding:0;display:grid;gap:4px;font:11px/1.45 ui-monospace,monospace;color:#3c4a44}\n      .pipe-tool-list li{padding:3px 7px;background:#f4f6f4;border-radius:4px}\n      .pipe-evo-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:6px}\n      .pipe-evo-item{text-align:center;min-width:0}\n      .pipe-evo-item img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:4px;border:1px solid #d5ddd9;display:block}\n      .pipe-evo-item span{display:block;font-size:10px;color:#555;margin-top:4px;white-space:nowrap}\n      .pipe-views-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:6px}\n      .pipe-views-grid img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:3px;border:1px solid #d5ddd9;display:block}\n      .pipe-ev-row{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}\n      .pipe-ev-item{background:#fff;border:1px solid #e2e5e0;border-radius:6px;padding:6px;text-align:center}\n      .pipe-ev-pair{display:grid;grid-template-columns:1fr 1fr;gap:3px}\n      .pipe-ev-item img{width:100%;height:36px;object-fit:cover;border-radius:3px;display:block}\n      .pipe-ev-item span{display:block;font-size:10px;color:#555;margin-top:4px;font-weight:500}\n      .pipe-judge-split{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;padding-top:6px;border-top:1px solid #eceee9;font-size:11px}\n      .pipe-judge-split div strong{display:block;color:#1a1a1a;font-size:11.5px;margin-bottom:2px}\n      .pipe-judge-split div p{margin:0;color:#666;line-height:1.4}\n      .pipe-gate-box{background:#d6efe9;border:1px solid #8ec9ba;border-radius:8px;padding:12px;text-align:center}\n      .pipe-gate-box strong{display:block;font-size:12.5px;color:#16382e}\n      .pipe-gate-box code{display:block;margin:5px 0;font:600 11px ui-monospace,monospace;color:#193c32}\n      .pipe-gate-box small{display:block;font-size:10.5px;color:#3d6358}\n      .pipe-foot-tag{font-size:11px;color:#54665e;background:#eef5f3;padding:7px 10px;border-radius:6px;text-align:center;font-weight:500}\n\n      @media(max-width:1050px){.pipe-ref-flow,.pipe-task-flow{grid-template-columns:1fr}.pipe-arrow{transform:rotate(90deg);padding:2px 0}.pipe-rollout-grid{grid-template-columns:1fr 1fr}}\n      @media(max-width:700px){.pipe-rollout-grid{grid-template-columns:1fr}.pipe-native-board,.pipe-rollout-grid{padding:16px}}\n\n      \n      .en-method-defs{position:absolute;width:0;height:0;overflow:hidden;pointer-events:none}\n      .en-chk,.en-crs{display:inline-grid;place-items:center;width:15px;height:15px;border-radius:50%;font:700 10px/1 system-ui;flex-shrink:0}\n      .en-chk{background:#ebf3ee;color:#2e6b4e;border:1px solid #2e6b4e}\n      .en-crs{background:#fbe9e7;color:#a63a2b;border:1px solid #a63a2b}\n\n      \n      .en-synth-board{padding:24px 26px;background:#fff;border-top:1px solid var(--line);color:#000;font-family:"Times New Roman",Times,Georgia,serif}\n      .en-synth-band{padding:0}\n      .en-synth-band+.en-synth-band{margin-top:10px;padding-top:10px;border-top:1px solid #cbd5e1}\n      .en-synth-title{margin:0 0 14px;padding-bottom:8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:16px;font-weight:700;letter-spacing:-.01em;color:#0f172a}\n      .en-top-grid{display:grid;grid-template-columns:1.05fr 28px 1.38fr 28px 1.05fr 28px 1.65fr 28px 1.55fr;align-items:center;gap:4px}\n      .en-arr-h{display:flex;align-items:center;justify-content:center;color:#334155}\n      .en-arr-h svg,.en-arr-v svg{display:block;overflow:visible}\n      .en-arr-v{display:flex;justify-content:center;padding:4px 0;color:#334155}\n\n      .en-unit-col{display:flex;flex-direction:column;align-items:center;text-align:center}\n      .en-unit-col h4{margin:0 0 8px;font-size:13.5px;font-weight:700;color:#0f172a;white-space:nowrap}\n      .en-src-icons{display:flex;align-items:center;justify-content:center;gap:10px;height:28px;margin-bottom:8px}\n      .en-src-icons img{height:24px;width:auto;object-fit:contain;display:block}\n      .en-hist-wrap{position:relative;width:100%;max-width:136px}\n      .en-hist-wrap svg{display:block;width:100%;height:auto}\n\n      .en-proc-card{background:#fff;border:1.5px solid #64748b;border-radius:8px;padding:6px 12px;display:flex;flex-direction:column;justify-content:center}\n      .en-proc-row{display:flex;align-items:center;gap:9px;padding:7px 2px;font-size:12.5px;font-weight:500;color:#0f172a;white-space:nowrap}\n      .en-proc-row+.en-proc-row{border-top:1px dashed #cbd5e1}\n      .en-proc-row svg{width:20px;height:20px;flex-shrink:0}\n\n      .en-gate-card{background:#fff;border:1.5px solid #64748b;border-radius:8px;display:grid;grid-template-columns:76px 1fr;align-items:center;padding:6px 10px}\n      .en-gate-left{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding-right:8px;border-right:1px dashed #cbd5e1;height:100%}\n      .en-gate-left svg{width:26px;height:26px}\n      .en-gate-left b{font-size:12px;font-weight:700;color:#0f172a;white-space:nowrap}\n      .en-gate-right{padding-left:10px;display:flex;flex-direction:column;justify-content:center}\n\n      .en-anchor-col{display:flex;flex-direction:column;align-items:center}\n      .en-anchor-hdr{display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:13.5px;font-weight:700;color:#0f172a}\n      .en-anchor-main{display:block;width:100%;aspect-ratio:1.8/1;border-radius:7px;overflow:hidden;border:2px solid #2e6b4e;box-shadow:0 2px 6px rgba(46,107,78,.12)}\n      .en-anchor-main img,.en-anchor-rejs a img{width:100%;height:100%;object-fit:cover;display:block}\n      .en-anchor-rejs{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;margin-top:7px}\n      .en-anchor-rejs figure{margin:0;padding:0!important;border:0!important;background:transparent!important;text-align:center}\n      .en-anchor-rejs a{display:block;aspect-ratio:1.55/1;border-radius:5px;overflow:hidden;border:1.5px solid #a63a2b}\n      .en-anchor-rejs figcaption{display:inline-flex;align-items:center;gap:4px;margin-top:4px;font-size:11.5px;color:#475569;font-weight:500}\n\n      .en-wrap-bridge{position:relative;height:34px;margin:8px 0 4px}\n      .en-wrap-bridge svg{width:100%;height:100%;display:block;overflow:visible}\n      .en-wrap-pill{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#f8fafc;border:1px solid #94a3b8;border-radius:999px;padding:2px 12px;font-size:11.5px;font-weight:700;color:#334155;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;box-shadow:0 1px 2px rgba(15,23,42,.04)}\n      .en-wrap-pill i{font-family:Georgia,serif;font-weight:400;font-style:italic}\n\n      .en-bot-grid{display:grid;grid-template-columns:.92fr 20px 1.22fr 20px 1.15fr 20px 1.22fr 20px 1.15fr 20px .95fr;align-items:stretch;gap:2px}\n      .en-v2-col1{display:flex;flex-direction:column;justify-content:space-between;align-items:center;background:#fff;border:1.5px solid #64748b;border-radius:8px;padding:7px 9px;text-align:center}\n      .en-v2-anchor-box{width:100%}\n      .en-v2-anchor-hdr{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:700;color:#0f172a;margin-bottom:4px}\n      .en-v2-anchor-img{display:block;width:100%;aspect-ratio:1.85/1;border-radius:5px;overflow:hidden;border:1.8px solid #2e6b4e}\n      .en-v2-anchor-img img{width:100%;height:100%;object-fit:cover;display:block}\n      .en-v2-down{display:flex;align-items:center;justify-content:center;gap:4px;color:#334155;font-size:10px;font-weight:600;padding:2px 0}\n      .en-v2-reqbot{width:100%;background:#f8fafc;border:1px solid #94a3b8;border-radius:6px;padding:5px 6px;display:flex;align-items:center;justify-content:center;gap:6px}\n      .en-v2-reqbot svg{width:20px;height:20px;flex-shrink:0}\n      .en-v2-reqbot div{text-align:left}\n      .en-v2-reqbot b{display:block;font-size:11.5px;color:#0f172a;line-height:1.1;white-space:nowrap}\n      .en-v2-reqbot span{display:block;font-size:9.8px;color:#475569;line-height:1.1;margin-top:1px;white-space:nowrap}\n\n      .en-bot-gate-card{background:#fff;border:1.5px solid #64748b;border-radius:8px;display:grid;grid-template-columns:68px 1fr;align-items:center;padding:6px 8px}\n      .en-bot-gate-left{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding-right:6px;border-right:1px dashed #cbd5e1;height:100%;text-align:center}\n      .en-bot-gate-left svg{width:26px;height:26px}\n      .en-bot-gate-left b{font-size:11.2px;font-weight:700;color:#0f172a;line-height:1.15}\n      .en-bot-gate-right{padding-left:8px;display:flex;flex-direction:column;justify-content:center}\n      .en-bot-gate-right .en-proc-row{padding:6px 1px;font-size:11.4px;gap:6px}\n      .en-bot-gate-right .en-proc-row svg{width:16px;height:16px}\n\n      .en-csf-col{display:grid;grid-template-rows:repeat(3,1fr);gap:7px}\n      .en-csf-item{display:grid;grid-template-columns:42px 1fr;gap:9px;align-items:center;padding:7px 10px;background:#fff;border:1.5px solid #64748b;border-radius:8px}\n      .en-csf-icon{width:42px;height:42px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;position:relative;flex-shrink:0}\n      .en-csf-icon code{font:700 12px/1.1 ui-monospace,monospace;color:#334155}\n      .en-csf-icon small{font:700 9.5px/1.1 ui-monospace,monospace;color:#475569;margin-top:2px}\n      .en-csf-icon img{width:100%;height:100%;object-fit:cover;display:block}\n      .en-slider-bar{position:absolute;left:3px;right:3px;bottom:3px;height:7px;border-radius:3px;background:rgba(35,61,84,.88);display:flex;align-items:center;padding:0 3px}\n      .en-slider-bar i{display:block;width:100%;height:1.5px;background:#cbd5e1;position:relative}\n      .en-slider-bar b{position:absolute;left:62%;top:50%;transform:translate(-50%,-50%);width:4.5px;height:4.5px;border-radius:50%;background:#93c5fd;border:1px solid #fff}\n      .en-csf-text h5{margin:0 0 2px;font-size:12.8px;font-weight:700;color:#0f172a;white-space:nowrap}\n      .en-csf-text h5 i,.en-rubric-box h5 i,.en-rubric-item strong i,.en-pkg-subcard p i{font-style:italic;font-weight:400;font-family:Georgia,'Times New Roman',serif}\n      .en-csf-text p{margin:0;font-size:11.3px;color:#475569;white-space:nowrap}\n\n      .en-rubric-box{background:#fff;border:1.6px solid #1e293b;border-radius:8px;padding:8px 11px;display:flex;flex-direction:column;justify-content:space-between}\n      .en-rubric-hdr{display:flex;align-items:center;justify-content:space-between;gap:6px;padding-bottom:6px;border-bottom:1px solid #cbd5e1}\n      .en-rubric-hdr h5{margin:0;font-size:13.2px;font-weight:700;color:#0f172a;white-space:nowrap}\n      .en-score-tiers{display:flex;gap:4px}\n      .en-score-tiers span{padding:1.5px 6.5px;border-radius:4px;font-size:10.8px;font-weight:700;color:#0f172a}\n      .en-tier-0{background:#fbe9e7;border:1px solid #a63a2b}\n      .en-tier-05{background:#fdf3e7;border:1px solid #9a5b13}\n      .en-tier-1{background:#ebf3ee;border:1px solid #2e6b4e}\n      .en-rubric-item{padding:4.5px 0}\n      .en-rubric-item+.en-rubric-item{border-top:1px dashed #cbd5e1}\n      .en-rubric-item.is-prior{border-top:1px solid #cbd5e1}\n      .en-rubric-item strong{display:block;font-size:12px;font-weight:700;color:#0f172a;white-space:nowrap}\n      .en-rubric-item span{display:block;font-size:11px;color:#475569;margin-top:1px;white-space:nowrap}\n\n      .en-pkg-box{background:#fff;border:1.6px solid #1e293b;border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;justify-content:space-between;text-align:center}\n      .en-pkg-box>h5{margin:0;padding-bottom:6px;border-bottom:1px solid #cbd5e1;font-size:13.2px;font-weight:700;color:#0f172a;display:flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap}\n      .en-pkg-subcard{background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:7px 8px;margin-top:6px;flex:1;display:flex;flex-direction:column;justify-content:center}\n      .en-pkg-subcard strong{display:block;font-size:12px;font-weight:700;color:#0f172a}\n      .en-pkg-subcard p{margin:3px 0 0;font-size:11.5px;color:#334155;white-space:nowrap}\n      .en-pkg-subcard small{display:block;margin-top:2px;font-size:10px;color:#64748b;white-space:nowrap}\n\n      \n      .en-rollout-board{padding:18px 14px;background:#fff;border-top:1px solid var(--line);color:#000;font-family:"Times New Roman",Times,Georgia,serif;overflow-x:auto}\n      .en-rollout-grid{display:grid;grid-template-columns:218px 12px 258px 12px minmax(390px,1fr) 12px 184px;align-items:stretch;min-width:1086px}\n      .en-r-card{background:#f8fafa;border:1.5px solid #94a3b8;border-radius:9px;padding:10px 9px;display:flex;flex-direction:column;justify-content:space-between;gap:6px;min-width:0}\n      .en-r-card>h4{margin:0;padding-bottom:6px;border-bottom:1.5px solid #1e293b;text-align:center;font-size:15px;font-weight:700;color:#000;letter-spacing:0}\n      .en-subbox{background:#fff;border:1.2px solid #475569;border-radius:6px;padding:7px 8px}\n      .en-subbox h5{margin:0 0 5px;padding-bottom:4px;border-bottom:1px dashed #1e293b;font-size:12px;font-weight:700;color:#000;display:flex;align-items:center;justify-content:space-between;gap:4px;white-space:nowrap}\n      .en-subbox h5 i{font-style:italic;font-weight:400}\n      .en-subbox p,.en-subbox li{margin:0;font-size:11px;line-height:1.36;color:#000}\n      .en-subbox ul{list-style:none;margin:0;padding:0;display:grid;gap:2px}\n\n      .en-c1-top{display:grid;grid-template-columns:62px minmax(0,1fr);gap:7px;align-items:center}\n      .en-c1-top a{display:block;width:62px;height:46px;border-radius:4px;overflow:hidden;border:1px solid #475569}\n      .en-c1-top img{width:100%;height:100%;object-fit:cover;display:block}\n      .en-c1-meta strong{display:block;font-size:13px;line-height:1.2;color:#000;margin-bottom:3px}\n      .en-c1-meta{min-width:0}\n      .en-c1-meta span{display:block;font-size:10.4px;line-height:1.35;color:#000;white-space:normal;overflow-wrap:break-word}\n      .en-c1-stack{display:flex;flex-direction:column;justify-content:space-between;gap:6px;flex:1}\n\n      .en-env-grid{display:grid;grid-template-columns:auto auto;justify-content:space-between;gap:5px 4px;margin-bottom:7px;padding-bottom:7px;border-bottom:1px dashed #1e293b}\n      .en-env-chip{display:flex;align-items:center;gap:3px;font-size:9.3px;font-weight:400;color:#000;white-space:nowrap}\n      .en-env-chip svg{width:14px;height:14px;flex-shrink:0}\n      .en-act-split{display:grid;grid-template-columns:1fr 82px;gap:6px;align-items:center;flex:1}\n      .en-code-lines{font:10.5px/1.42 "Times New Roman",Times,serif;color:#000;display:grid;gap:2px}\n      .en-lib-sec{margin-top:7px;padding-top:6px;border-top:1px dashed #1e293b}\n      .en-lib-sec strong{display:block;font-size:11.5px;margin-bottom:2px}\n      .en-drf-col{display:flex;flex-direction:column;align-items:flex-end;gap:2px}\n      .en-drf-row{display:grid;grid-template-columns:30px 48px;align-items:center;gap:4px;font-size:10px;color:#000}\n      .en-drf-row span{text-align:right}\n      .en-drf-row a{display:block;width:48px;height:32px;border-radius:3px;overflow:hidden;border:1px solid #64748b}\n      .en-drf-row img{width:100%;height:100%;object-fit:cover;display:block}\n      .en-drf-arr{width:48px;text-align:center;font-size:9px;line-height:1;color:#1e293b}\n      .en-deliv-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;text-align:center;padding-top:2px}\n      .en-deliv-item{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;color:#000;white-space:nowrap}\n      .en-deliv-icon{height:22px;display:flex;align-items:center;justify-content:center;gap:2px}\n      .en-deliv-icon img{width:28px;height:20px;object-fit:cover;border-radius:2px;border:1px solid #64748b}\n\n      .en-c3-top{display:grid;grid-template-columns:160px 1fr;gap:8px;align-items:stretch;height:100%}\n      .en-cam-col{display:flex;flex-direction:column;justify-content:space-between}\n      .en-cam-col code{display:block;font:10.2px/1.3 "Times New Roman",Times,serif;color:#000;margin-bottom:5px;white-space:nowrap}\n      .en-cam-matrix{display:grid;gap:4px;margin:auto 0}\n      .en-cam-row{display:grid;grid-template-columns:42px 1fr;align-items:center;gap:4px;font-size:9.4px;color:#0f172a}\n      .en-cam-thumbs{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}\n      .en-cam-thumbs a{display:block;aspect-ratio:1.48/1;border-radius:2.5px;overflow:hidden;border:1px solid #64748b}\n      .en-cam-thumbs img{width:100%;height:100%;object-fit:cover;display:block}\n\n      .en-vj-col{display:flex;flex-direction:column;justify-content:space-between;padding-left:8px;border-left:1px dashed #1e293b}\n      .en-vj-split{display:grid;grid-template-columns:1fr 1fr;gap:8px;flex:1}\n      .en-vj-pane{display:flex;flex-direction:column;justify-content:space-between}\n      .en-vj-pane+.en-vj-pane{padding-left:8px;border-left:1px dashed #1e293b}\n      .en-vj-pane h6{margin:0 0 4px;padding-bottom:3px;border-bottom:1px dashed #1e293b;text-align:center;font-size:10px;font-weight:700;color:#0f172a}\n      .en-chk-list{display:grid;gap:3.5px;font-size:9.5px;color:#0f172a}\n      .en-chk-row{display:flex;align-items:center;gap:4px;white-space:nowrap}\n      .en-aes-row{display:flex;justify-content:space-between;font-size:9.5px;color:#0f172a}\n      .en-score-foot{margin-top:5px;padding-top:4px;border-top:1px dashed #1e293b;text-align:center;font-size:9.5px;color:#0f172a;white-space:nowrap}\n      .en-score-foot i,.en-r-math{font-style:italic;font-family:Georgia,serif}\n\n      .en-c3-bot{display:grid;grid-template-columns:1fr 1.28fr;gap:8px}\n      .en-fn-body{display:grid;grid-template-columns:92px 1fr;gap:7px;align-items:center}\n      .en-fn-pair{display:grid;grid-template-columns:38px 12px 38px;align-items:center;gap:1px;text-align:center;font-size:8.8px}\n      .en-fn-pair a{display:block;width:38px;height:44px;border-radius:3px;overflow:hidden;border:1px solid #64748b}\n      .en-fn-pair img{width:100%;height:100%;object-fit:cover;display:block}\n\n      .en-gate-rows{display:grid;gap:5px;padding:4px 0 8px;border-bottom:1px dashed #1e293b;margin-bottom:8px;font-size:10px}\n      .en-gate-row{display:grid;grid-template-columns:1fr 14px 28px;align-items:baseline}\n      .en-data-grid{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px dashed #1e293b;margin-bottom:5px}\n      .en-data-cell{padding:6px 2px;text-align:center}\n      .en-data-cell:nth-child(2),.en-data-cell:nth-child(4){border-left:1px dashed #1e293b}\n      .en-data-cell:nth-child(3),.en-data-cell:nth-child(4){border-top:1px dashed #1e293b;display:flex;align-items:center;justify-content:center;gap:4px;font-size:10px;font-weight:600}\n      .en-data-cell strong{display:block;font-size:11.5px;font-weight:700;color:#0f172a}\n      .en-data-cell span{display:block;font-size:8.8px;color:#334155;white-space:nowrap}\n      @media(max-width:1000px){.en-top-grid,.en-bot-grid{grid-template-columns:1fr}.en-arr-h{transform:rotate(90deg);padding:4px 0}}\n    `;
        document.head.append(st);
    }
    document.querySelectorAll("#method .paper-figure img").forEach(img => {
        img.loading = "eager";
    });
    const taskStrips = [ {
        selector: 'a[href*="hall_1.webp"]',
        prefix: "hall",
        labels: [ "输入参考", "几何白模", "主视角渲染", "天顶画与吊灯", "拱形镜龛反射", "眩光与照明交互" ]
    }, {
        selector: 'a[href*="press_1.webp"]',
        prefix: "press",
        labels: [ "输入参考", "几何白模", "主视角渲染", "外露啮合齿轮", "调压丝杆与手柄", "四层油墨罐堆叠" ]
    } ];
    for (const {selector: selector, prefix: prefix, labels: labels} of taskStrips) {
        const oldLink = document.querySelector(selector);
        if (!oldLink) continue;
        const grid = document.createElement("div");
        grid.className = "native-task-strip";
        labels.forEach((label, idx) => {
            const src = `assets/bmk/tasks/${prefix}_${idx + 1}.webp`;
            const item = document.createElement("figure");
            item.className = "task-strip-item";
            item.innerHTML = `<a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="${label}" width="356" height="228"></a><figcaption>${label}</figcaption>`;
            grid.append(item);
        });
        oldLink.replaceWith(grid);
    }
    const bmkData = {
        bw: {
            cols: [ "输入参考 / 文本提示", "Qwen3.8-27B（基座）", "3DCodeFactory（微调后）" ],
            oursIdx: 2,
            caption: "BlenderWorld（场景构建）· 同一任务下输入参考/文本指令与基座与微调模型构建产物的对照。",
            rows: [ {
                refImg: "assets/bmk/bw/bw_0059_ref_full.png",
                cells: [ "assets/bmk/bw/bw_0059_base_full.png", "assets/bmk/bw/bw_0059_sft_full.png" ]
            }, {
                refImg: "assets/bmk/bw/bw_0038_ref_full.png",
                cells: [ "assets/bmk/bw/bw_0038_base_full.png", "assets/bmk/bw/bw_0038_sft_full.png" ]
            }, {
                refImg: "assets/bmk/bw/bw_0078_ref_full.png",
                cells: [ "assets/bmk/bw/bw_0078_base_full.png", "assets/bmk/bw/bw_0078_sft_full.png" ]
            }, {
                prompt: {
                    tag: "TEXT PROMPT · 纯文本指令",
                    title: "雨夜老街霓虹与积水倒影",
                    desc: "10×30 米老城雨夜街景，两侧为 2–3 层复古商铺、发光霓虹招牌、暖色街灯、停靠车辆与湿滑积水路面。"
                },
                cells: [ "assets/bmk/bw/bw_0109_base_full.png", "assets/bmk/bw/bw_0109_sft_full.png" ]
            }, {
                prompt: {
                    tag: "TEXT PROMPT · 纯文本指令",
                    title: "红砖工厂改造 Loft 工作室",
                    desc: "18×12×6 米红砖厂房改造空间：白缝清水红砖墙、黑色钢框高窗、斜射日光光斑、外露钢屋架与工作会客区。"
                },
                cells: [ "assets/bmk/bw/bw_0134_base_full.png", "assets/bmk/bw/bw_0134_sft_full.png" ]
            } ]
        },
        bg: {
            cols: [ "初始场景", "目标场景", "Qwen3.8-27B（基座）", "3DCodeFactory（微调后）" ],
            oursIdx: 3,
            caption: "BlenderGym（场景编辑）· 对比几何细分、螺旋堆叠、家具摆放与表情形变任务中的局部编辑精度。",
            rows: [ "geometry3", "geometry44", "placement29", "blendshape52", "blendshape17" ].map(id => ({
                refImg: `assets/bmk/bg/${id}_start_full.png`,
                cells: [ `assets/bmk/bg/${id}_goal_full.png`, `assets/bmk/bg/${id}_base_full.png`, `assets/bmk/bg/${id}_sft_full.png` ]
            }))
        },
        p3d: {
            cols: [ "输入参考图", "Qwen3.8-27B（基座）", "3DCodeFactory（微调后）" ],
            oursIdx: 2,
            refWhite: true,
            caption: "P3D-Bench（Three.js 子集）· 对照单张参考图下的天桥、长椅、木椅、手摇绞盘与复古电视建模效果。",
            rows: [ "000361", "000031", "000064", "000282", "000338" ].map(id => ({
                refImg: `assets/bmk/p3d/${id}_ref_full.png`,
                cells: [ `assets/bmk/p3d/${id}_base_full.png`, `assets/bmk/p3d/${id}_sft_full.png` ]
            }))
        },
        "3dc": {
            cols: [ "文本指令与参考网格", "Qwen3.8-27B（基座）", "3DCodeFactory（微调后）" ],
            oursIdx: 2,
            darkCells: true,
            caption: "3DCodeBench（物体建模）· 从纯文本描述生成三维物体网格，对比几何结构完整性与姿态准确性。",
            rows: [ {
                splitPrompt: {
                    tag: "ARCHED DOOR",
                    title: "拱窗蓝色木门",
                    desc: "下部带内凹护板、上部设十字格栅拱形玻璃窗与金属门把手的古典木门。",
                    gt: "assets/bmk/3dc/door_gt_full.png"
                },
                cells: [ "assets/bmk/3dc/door_base_full.png", "assets/bmk/3dc/door_sft_full.png" ]
            }, {
                splitPrompt: {
                    tag: "WOODEN SPATULA",
                    title: "立式木质锅铲",
                    desc: "带有扁平外扩铲头、修长矩形手柄以及顶部圆形挂孔的厨房木铲。",
                    gt: "assets/bmk/3dc/spatula_gt_full.png"
                },
                cells: [ "assets/bmk/3dc/spatula_base_full.png", "assets/bmk/3dc/spatula_sft_full.png" ]
            }, {
                splitPrompt: {
                    tag: "FLOWERING PLANT",
                    title: "藜芦开花植株",
                    desc: "基部呈莲座状排列宽大褶皱绿叶，顶端延伸出自然弯曲的白色花穗。",
                    gt: "assets/bmk/3dc/plant_gt_full.png"
                },
                cells: [ "assets/bmk/3dc/plant_base_full.png", "assets/bmk/3dc/plant_sft_full.png" ]
            }, {
                splitPrompt: {
                    tag: "PRICKLY PEAR",
                    title: "仙人掌扁平茎节",
                    desc: "由厚实基底向上逐级分枝生长的扁平椭圆形肉质仙人掌茎节链。",
                    gt: "assets/bmk/3dc/cactus_gt_full.png"
                },
                cells: [ "assets/bmk/3dc/cactus_base_full.png", "assets/bmk/3dc/cactus_sft_full.png" ]
            }, {
                splitPrompt: {
                    tag: "PLEATED LAMP",
                    title: "百褶灯罩台灯",
                    desc: "包含白色锥形百褶布艺灯罩、纤细金属灯杆与阶梯状圆形底座。",
                    gt: "assets/bmk/3dc/lamp_gt_full.png"
                },
                cells: [ "assets/bmk/3dc/lamp_base_full.png", "assets/bmk/3dc/lamp_sft_full.png" ]
            } ]
        }
    };
    const bmkSection = document.querySelector(".benchmark-comparison");
    const oldBmkFig = bmkSection?.querySelector(".comparison-figure");
    if (bmkSection && oldBmkFig) {
        bmkSection.id = "benchmark-gallery";
        bmkSection.classList.add("compact-benchmarks");
        const gallery = document.createElement("div");
        gallery.className = "benchmark-deck";
        oldBmkFig.replaceWith(gallery);
        const labels = {
            bw: [ "机车车库", "场景构建", "洁净室管线", "雨夜老街", "红砖 Loft" ],
            bg: [ "几何细分", "螺旋堆叠", "家具摆放", "表情形变 01", "表情形变 02" ],
            p3d: [ "人行天桥", "户外长椅", "木质座椅", "手摇绞盘", "复古电视" ],
            "3dc": [ "拱窗木门", "木质锅铲", "开花植株", "仙人掌", "百褶台灯" ]
        };
        let key = "bw", index = 0, ticket = 0, elapsed = 0, last = 0;
        const reduced = matchMedia("(prefers-reduced-motion: reduce)");
        let playing = !reduced.matches, visible = false, loading = false;
        const dialog = document.createElement("dialog");
        dialog.className = "benchmark-zoom";
        dialog.setAttribute("aria-label", "放大案例对比");
        dialog.innerHTML = '<div class="bench-zoom-bar"><strong></strong><button type="button" aria-label="关闭放大对比">×</button></div><div class="bench-zoom-content"></div>';
        document.body.append(dialog);
        dialog.querySelector("button").onclick = () => dialog.close();
        dialog.addEventListener("click", e => {
            if (e.target === dialog) dialog.close();
        });
        const escape = value => String(value).replace(/[&<>"']/g, c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[c]));
        function frame(row, cfg) {
            let first;
            if (row.refImg) first = `<img src="${row.refImg}" alt="${escape(cfg.cols[0])}"/>`; else if (row.splitPrompt) {
                const p = row.splitPrompt;
                first = `<img src="${p.gt}" alt="${escape(p.title + ": " + p.desc)}" title="${escape(p.title + ": " + p.desc)}"/>`;
            } else {
                const p = row.prompt || row.splitPrompt;
                first = `<div class="bench-prompt"><span>任务描述</span><strong>${escape(p.title)}</strong><p>${escape(p.desc)}</p></div>${p.gt ? `<img class="bench-reference-mesh" src="${p.gt}" alt="参考网格"/>` : ""}`;
            }
            const cells = [ first, ...row.cells.map((src, i) => `<img src="${src}" alt="${escape(cfg.cols[i + 1])}"/>`) ];
            return cells.map((content, i) => `<figure class="bench-view${i === cfg.oursIdx ? " is-ours" : ""}"><figcaption><span>${i === 0 ? "INPUT" : i === cfg.oursIdx ? "OURS" : cfg.cols[i].includes("目标") ? "TARGET" : "BASE"}</span>${escape(cfg.cols[i])}</figcaption><div class="bench-frame${cfg.darkCells && i > 0 ? " is-dark" : ""}">${content}</div></figure>`).join("");
        }
        function controls() {
            const play = gallery.querySelector("[data-bench-play]");
            if (!play) return;
            play.textContent = playing ? "Ⅱ 暂停轮播" : "▷ 自动轮播";
            play.setAttribute("aria-pressed", String(playing));
        }
        async function select(next, animate = true, manual = true) {
            const cfg = bmkData[key];
            const nextIndex = (next + cfg.rows.length) % cfg.rows.length;
            const token = ++ticket, row = cfg.rows[nextIndex];
            if (manual) {
                playing = false;
                controls();
            }
            const sources = [ row.refImg, row.splitPrompt?.gt, ...row.cells ].filter(Boolean);
            loading = true;
            let loadTimeout;
            await Promise.race([
                Promise.all(sources.map(src => {
                    const img = new Image;
                    img.src = src;
                    return img.decode().catch(() => {});
                })),
                new Promise(resolve => { loadTimeout = setTimeout(resolve, 4000); })
            ]);
            clearTimeout(loadTimeout);
            if (token !== ticket) return;
            loading = false;
            index = nextIndex;
            elapsed = 0;
            const promptNote = gallery.querySelector(".bench-task-note");
            if (promptNote) promptNote.textContent = row.splitPrompt?.desc || "";
            const stage = gallery.querySelector(".bench-stage");
            gallery.querySelectorAll(".bench-stage-outgoing").forEach(el => el.remove());
            const outgoing = animate && !reduced.matches ? stage.cloneNode(true) : null;
            stage.innerHTML = frame(row, cfg);
            if (outgoing) {
                outgoing.classList.add("bench-stage-outgoing");
                outgoing.setAttribute("aria-hidden", "true");
                stage.after(outgoing);
                const fade = outgoing.animate([ {
                    opacity: 1
                }, {
                    opacity: 0
                } ], {
                    duration: 480,
                    easing: "ease-in-out",
                    fill: "forwards"
                });
                fade.onfinish = () => outgoing.remove();
            }
            gallery.querySelector(".bench-case-title").textContent = row.prompt?.title || row.splitPrompt?.title || labels[key][index];
            gallery.querySelector(".bench-counter").textContent = `${String(index + 1).padStart(2, "0")} / ${String(cfg.rows.length).padStart(2, "0")}`;
            gallery.querySelectorAll("[data-bench-case]").forEach((b, i) => {
                b.classList.toggle("active", i === index);
                b.setAttribute("aria-pressed", String(i === index));
                b.style.setProperty("--progress", "0%");
            });
            const upcoming = cfg.rows[(index + 1) % cfg.rows.length];
            [ upcoming.refImg, upcoming.splitPrompt?.gt, ...upcoming.cells ].filter(Boolean).forEach(src => {
                const img = new Image;
                img.src = src;
            });
        }
        function renderBmk(nextKey) {
            if (!bmkData[nextKey]) return;
            key = nextKey;
            index = 0;
            elapsed = 0;
            ticket++;
            loading = false;
            const cfg = bmkData[key];
            gallery.dataset.benchmark = key;
            gallery.style.setProperty("--bench-cols", cfg.cols.length);
            gallery.innerHTML = `<div class="bench-case-bar"><div><span class="bench-counter">01 / 05</span><strong class="bench-case-title">${escape(labels[key][0])}</strong></div><div class="bench-actions"><button type="button" data-bench-play></button><button type="button" data-bench-zoom>放大对比 ↗</button><button type="button" data-bench-prev aria-label="上一个案例">←</button><button type="button" data-bench-next aria-label="下一个案例">→</button></div></div>${key === "3dc" ? `<p class="bench-task-note">${escape(cfg.rows[0].splitPrompt.desc)}</p>` : ""}<div class="bench-stage-scroll"><div class="bench-stage" aria-label="当前案例的模型对比">${frame(cfg.rows[0], cfg)}</div></div><div class="bench-case-strip" role="group" aria-label="选择对比案例">${cfg.rows.map((row, i) => `<button type="button" data-bench-case="${i}" aria-pressed="${i === 0}" class="${i === 0 ? "active" : ""}"><img src="${row.cells[row.cells.length - 1]}" alt=""/><span><small>${String(i + 1).padStart(2, "0")}</small>${escape(labels[key][i])}</span><i></i></button>`).join("")}</div>`;
            controls();
            gallery.querySelectorAll("[data-bench-case]").forEach(b => b.onclick = () => select(Number(b.dataset.benchCase)));
            gallery.querySelector("[data-bench-prev]").onclick = () => select(index - 1);
            gallery.querySelector("[data-bench-next]").onclick = () => select(index + 1);
            gallery.querySelector("[data-bench-play]").onclick = () => {
                playing = !playing;
                elapsed = 0;
                controls();
            };
            gallery.querySelector("[data-bench-zoom]").onclick = () => {
                dialog.dataset.benchmark = key;
                dialog.style.setProperty("--bench-cols", cfg.cols.length);
                dialog.querySelector("strong").textContent = `${key === "bw" ? "BlenderWorld" : key === "bg" ? "BlenderGym" : key === "p3d" ? "P3D-Bench" : "3DCodeBench"} · ${labels[key][index]}`;
                dialog.querySelector(".bench-zoom-content").innerHTML = frame(cfg.rows[index], cfg);
                dialog.showModal();
            };
            select(0, false, false);
        }
        bmkSection.querySelectorAll("[data-comparison]").forEach(btn => {
            btn.onclick = () => {
                bmkSection.querySelectorAll("[data-comparison]").forEach(x => {
                    x.classList.toggle("active", x === btn);
                    x.setAttribute("aria-pressed", String(x === btn));
                });
                renderBmk(btn.dataset.comparison);
            };
        });
        new IntersectionObserver(entries => {
            visible = entries[0].isIntersecting;
        }, {
            threshold: .35
        }).observe(gallery);
        function tick(now) {
            const dt = last ? Math.min(now - last, 100) : 0;
            last = now;
            if (playing && visible && !loading && !document.hidden && !dialog.open) {
                elapsed += dt;
                gallery.querySelector(".bench-case-strip .active")?.style.setProperty("--progress", `${Math.min(elapsed / 2000, 1) * 100}%`);
                if (elapsed >= 2000) {
                    elapsed = 0;
                    select(index + 1, true, false);
                }
            }
            requestAnimationFrame(tick);
        }
        reduced.addEventListener("change", () => {
            if (reduced.matches) {
                playing = false;
                controls();
            }
        });
        renderBmk("bw");
        requestAnimationFrame(tick);
    }
    const trajSection = document.querySelector("#evolution .comparison, #results .comparison");
    const oldTrajFig = trajSection?.querySelector(".comparison-figure, .native-traj-board");
    if (trajSection && oldTrajFig) {
        const steps = [ {
            turn: 20,
            baseIdx: 1,
            baseTurn: "Turn 20",
            baseDesc: "搭建房间白模外壳与左右窗洞开口",
            sftIdx: 1,
            sftPhase: "阶段一 · 结构与橱柜",
            sftDesc: "校准房间单点透视、顶角线与橡木地板材质"
        }, {
            turn: 40,
            baseIdx: 2,
            baseTurn: "Turn 40",
            baseDesc: "放置左侧与后方基础底柜、吊柜几何块",
            sftIdx: 2,
            sftPhase: "阶段一 · 结构与橱柜",
            sftDesc: "构建左侧拱形格栅窗与右后方法式玻璃门"
        }, {
            turn: 60,
            baseIdx: 3,
            baseTurn: "Turn 60",
            baseDesc: "补充右侧浅木色高柜与后墙开放储物格",
            sftIdx: 3,
            sftPhase: "阶段一 · 结构与橱柜",
            sftDesc: "嵌入左侧深色线框底柜、水槽龙头与双层烤箱"
        }, {
            turn: 80,
            baseIdx: 4,
            baseTurn: "Turn 80",
            baseDesc: "放置中央岛台与 4 把粗略的方块吧凳占位",
            sftIdx: 4,
            sftPhase: "阶段一 · 结构与橱柜",
            sftDesc: "完善后墙对称吊柜、灶台烟机与大理石壁龛"
        }, {
            turn: 100,
            baseIdx: 5,
            baseTurn: "Turn 101（提前停止）",
            baseDesc: "仅添加简单单环发光灯圈便终止生成（累计仅 14 次视觉自检）",
            sftIdx: 5,
            sftPhase: "阶段一 · 结构与橱柜",
            sftDesc: "完成右侧通顶储物高柜与黄铜装饰嵌条"
        }, {
            turn: 120,
            baseIdx: 5,
            baseTurn: "Turn 101（已停止迭代）",
            baseDesc: "基座已于第 101 轮提前终止，岛台与吧凳停留于粗略几何块",
            sftIdx: 6,
            sftPhase: "阶段二 · 视觉闭环精修",
            sftDesc: "新建中央瀑布边云石岛台与深色内嵌柜体"
        }, {
            turn: 140,
            baseIdx: 5,
            baseTurn: "Turn 101（已停止迭代）",
            baseDesc: "基座已于第 101 轮提前终止，缺失软包吧台椅与五金细节",
            sftIdx: 7,
            sftPhase: "阶段二 · 视觉闭环精修",
            sftDesc: "精修 4 把焦糖色皮质软包高脚吧台椅与金属脚踏"
        }, {
            turn: 160,
            baseIdx: 5,
            baseTurn: "Turn 101（已停止迭代）",
            baseDesc: "基座已于第 101 轮提前终止，吊灯简化为单一白环",
            sftIdx: 8,
            sftPhase: "阶段二 · 视觉闭环精修",
            sftDesc: "对照参考图构建三环交织鎏金吊灯与筒灯阵列"
        }, {
            turn: 180,
            baseIdx: 5,
            baseTurn: "Turn 101（已停止迭代）",
            baseDesc: "基座已于第 101 轮提前终止，后墙缺乏大理石纹理与壁灯",
            sftIdx: 9,
            sftPhase: "阶段二 · 视觉闭环精修",
            sftDesc: "细化水墨纹对拼大理石防溅背墙与两侧壁灯"
        }, {
            turn: 200,
            baseIdx: 5,
            baseTurn: "Turn 101（最终得分 69.4）",
            baseDesc: "基座最终交付：仅 14 次视觉自检，核心构件与材质显著简化",
            sftIdx: 10,
            sftPhase: "阶段二 · 最终交付（84.1 分）",
            sftDesc: "补齐台面果盘、厨电、搁板绿植与窗外林景（累计 84 次视觉自检）"
        } ];
        const baseImgsHTML = [ 1, 2, 3, 4, 5 ].map(i => {
            const src = `assets/bmk/kitchen/base_0${i}.webp`;
            return `<a href="${src}" data-base-frame="${i}" class="${i === 1 ? "is-active" : ""}" target="_blank" rel="noopener"><img src="${src}" alt="基座模型阶段 ${i}" width="960" height="540"></a>`;
        }).join("");
        const sftImgsHTML = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ].map(i => {
            const src = `assets/bmk/kitchen/sft_${String(i).padStart(2, "0")}.webp`;
            return `<a href="${src}" data-sft-frame="${i}" class="${i === 1 ? "is-active" : ""}" target="_blank" rel="noopener"><img src="${src}" alt="3DCodeFactory 阶段 ${i}" width="960" height="540"></a>`;
        }).join("");
        const stepBtnsHTML = steps.map((st, idx) => `<button type="button" class="traj-step-btn${idx >= 5 ? " is-phase2" : ""}${idx === 0 ? " active" : ""}" data-step-idx="${idx}">T${st.turn}</button>`).join("");
        const pauseIcon = '<svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><rect x="2.2" y="1.8" width="2.8" height="8.4" rx="0.8"/><rect x="7" y="1.8" width="2.8" height="8.4" rx="0.8"/></svg>';
        const playIcon = '<svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2.8 1.8c0-.5.55-.8 1-.52l6.4 4.2a.62.62 0 0 1 0 1.04l-6.4 4.2c-.45.28-1-.02-1-.52V1.8Z"/></svg>';
        const player = document.createElement("div");
        player.className = "traj-player";
        player.innerHTML = `
      <div class="traj-top-bar">
        <div class="traj-anchor-chip">
          <a class="traj-anchor-thumb" href="assets/bmk/kitchen/ref.webp" target="_blank" rel="noopener" title="点击放大输入参考图">
            <img src="assets/bmk/kitchen/ref.webp" alt="输入参考图" width="160" height="100">
          </a>
          <div class="traj-anchor-meta">
            <span>TARGET ANCHOR · 输入参考图</span>
            <strong>现代奢华岛台厨房重建任务</strong>
          </div>
        </div>
        <div class="traj-controls">
          <div class="traj-steps-bar" role="group" aria-label="播放控制与迭代轮次">
            <button type="button" class="traj-play-btn" id="traj-play-toggle" aria-label="暂停自动演进" title="暂停/播放自动演进">${pauseIcon}</button>
            ${stepBtnsHTML}
          </div>
        </div>
      </div>

      <div class="traj-dual-stage">
        <article class="traj-viewport-card">
          <div class="traj-vp-header">
            <div class="traj-vp-title">Qwen3.8-27B（原始基座）</div>
            <div class="traj-vp-stats">
              <span>第 101 轮早停 · 14 次自检</span>
              <span class="traj-vp-score">69.4 分</span>
            </div>
          </div>
          <div class="traj-canvas" id="traj-base-canvas">
            <span class="traj-early-stop" id="traj-early-notice">已于第 101 轮提前终止迭代</span>
            ${baseImgsHTML}
          </div>
          <div class="traj-vp-footer">
            <span class="traj-vp-desc" id="traj-base-desc">${steps[0].baseDesc}</span>
          </div>
        </article>

        <article class="traj-viewport-card is-ours">
          <div class="traj-vp-header">
            <div class="traj-vp-title">3DCodeFactory（微调后）</div>
            <div class="traj-vp-stats">
              <span>200 轮 · 84 次自检（6×）</span>
              <span class="traj-vp-score">84.1 分（+14.7）</span>
            </div>
          </div>
          <div class="traj-canvas" id="traj-sft-canvas">
            ${sftImgsHTML}
          </div>
          <div class="traj-vp-footer">
            <span class="traj-vp-desc" id="traj-sft-desc">${steps[0].sftDesc}</span>
            <span class="traj-vp-meta" id="traj-sft-phase">${steps[0].sftPhase}</span>
          </div>
        </article>
      </div>
    `;
        oldTrajFig.replaceWith(player);
        let curStep = 0;
        let playing = true;
        let inView = false;
        let timer = null;
        const stepBtns = [ ...player.querySelectorAll(".traj-step-btn") ];
        const baseFrames = [ ...player.querySelectorAll("[data-base-frame]") ];
        const sftFrames = [ ...player.querySelectorAll("[data-sft-frame]") ];
        const baseDesc = player.querySelector("#traj-base-desc");
        const sftDesc = player.querySelector("#traj-sft-desc");
        const sftPhase = player.querySelector("#traj-sft-phase");
        const earlyNotice = player.querySelector("#traj-early-notice");
        const playToggle = player.querySelector("#traj-play-toggle");
        function setStep(idx) {
            curStep = (idx + steps.length) % steps.length;
            const st = steps[curStep];
            stepBtns.forEach((b, i) => b.classList.toggle("active", i === curStep));
            baseFrames.forEach(a => a.classList.toggle("is-active", Number(a.dataset.baseFrame) === st.baseIdx));
            sftFrames.forEach(a => a.classList.toggle("is-active", Number(a.dataset.sftFrame) === st.sftIdx));
            baseDesc.textContent = st.baseDesc;
            sftDesc.textContent = st.sftDesc;
            sftPhase.textContent = st.sftPhase;
            earlyNotice.classList.toggle("is-visible", curStep >= 5);
        }
        function syncTimer() {
            clearInterval(timer);
            timer = null;
            if (playing && inView && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                timer = setInterval(() => setStep(curStep + 1), 1750);
            }
            playToggle.innerHTML = playing ? pauseIcon : playIcon;
            playToggle.setAttribute("aria-label", playing ? "暂停自动演进" : "播放自动演进");
            playToggle.classList.toggle("is-paused", !playing);
        }
        playToggle.onclick = () => {
            playing = !playing;
            syncTimer();
        };
        stepBtns.forEach((btn, idx) => {
            btn.onclick = () => {
                playing = false;
                setStep(idx);
                syncTimer();
            };
        });
        new IntersectionObserver(entries => {
            inView = entries.some(e => e.isIntersecting);
            syncTimer();
        }, {
            threshold: .2
        }).observe(player);
    }
    if (!document.getElementById("en-method-svg-defs")) {
        const defs = document.createElement("div");
        defs.id = "en-method-svg-defs";
        defs.className = "en-method-defs";
        defs.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">\n      <defs>\n        <linearGradient id="en-hist-grad" x1="0" y1="0" x2="0" y2="1">\n          <stop offset="0%" stop-color="#8AB6DC"/>\n          <stop offset="100%" stop-color="#E4F0FA"/>\n        </linearGradient>\n        <symbol id="en-ic-deepseek" viewBox="0 0 24 18">\n          <path fill="#3B6CF6" d="M22.92 1.43C22.67 1.31 22.57 1.54 22.42 1.66C22.37 1.69 22.33 1.74 22.29 1.79C21.93 2.17 21.51 2.42 20.97 2.39C20.17 2.35 19.48 2.60 18.88 3.21C18.75 2.46 18.32 2.00 17.67 1.72C17.34 1.57 16.99 1.42 16.75 1.09C16.59 0.86 16.54 0.60 16.46 0.34C16.41 0.19 16.35 0.03 16.18 0.00C15.98 -0.03 15.91 0.14 15.83 0.27C15.53 0.82 15.41 1.43 15.43 2.05C15.45 3.43 16.04 4.54 17.20 5.32C17.33 5.41 17.37 5.50 17.32 5.63C17.24 5.90 17.15 6.16 17.07 6.44C17.01 6.61 16.94 6.65 16.75 6.57C16.11 6.30 15.56 5.91 15.07 5.43C14.25 4.63 13.50 3.75 12.57 3.06C12.35 2.90 12.13 2.75 11.90 2.61C10.95 1.68 12.03 0.92 12.28 0.83C12.54 0.74 12.37 0.42 11.53 0.42C10.68 0.42 9.91 0.71 8.93 1.08C8.79 1.14 8.64 1.18 8.48 1.21C7.59 1.04 6.67 1.01 5.70 1.12C3.88 1.32 2.43 2.18 1.36 3.65C0.08 5.41 -0.22 7.42 0.15 9.51C0.54 11.71 1.66 13.54 3.39 14.96C5.18 16.44 7.25 17.17 9.60 17.03C11.03 16.94 12.62 16.75 14.42 15.23C14.87 15.46 15.35 15.55 16.14 15.62C16.75 15.67 17.33 15.59 17.78 15.49C18.49 15.34 18.44 14.68 18.19 14.56C16.11 13.60 16.56 13.99 16.15 13.67C17.21 12.42 18.82 10.20 19.32 7.17C19.37 6.84 19.43 6.37 19.42 6.10C19.42 5.93 19.46 5.87 19.64 5.85C20.17 5.79 20.67 5.65 21.14 5.39C22.48 4.66 23.03 3.45 23.15 2.00C23.17 1.78 23.15 1.55 22.92 1.43ZM11.17 14.47C9.16 12.89 8.18 12.37 7.78 12.39C7.40 12.41 7.47 12.84 7.55 13.13C7.64 13.40 7.75 13.60 7.91 13.84C8.02 14.00 8.10 14.24 7.80 14.42C7.15 14.82 6.02 14.29 5.97 14.26C4.66 13.49 3.56 12.47 2.78 11.07C2.04 9.72 1.60 8.28 1.53 6.74C1.51 6.37 1.62 6.24 1.99 6.17C2.48 6.08 2.98 6.06 3.47 6.14C5.52 6.44 7.28 7.36 8.74 8.81C9.58 9.64 10.22 10.63 10.87 11.60C11.56 12.63 12.31 13.61 13.26 14.41C13.60 14.70 13.87 14.91 14.12 15.07C13.35 15.15 12.06 15.17 11.17 14.47ZM12.14 8.26C12.14 8.09 12.27 7.96 12.44 7.96C12.60 7.96 12.73 8.09 12.73 8.26C12.73 8.42 12.60 8.56 12.44 8.56C12.27 8.56 12.14 8.42 12.14 8.26Z"/>\n        </symbol>\n        <symbol id="en-ic-claude" viewBox="0 0 22 18">\n          <rect x="4" y="3.8" width="14" height="8.6" rx=".8" fill="#DA7756"/>\n          <rect x="1.6" y="7.2" width="2.6" height="2.8" rx=".4" fill="#DA7756"/>\n          <rect x="17.8" y="7.2" width="2.6" height="2.8" rx=".4" fill="#DA7756"/>\n          <rect x="5.4" y="12.2" width="1.4" height="2.8" rx=".3" fill="#DA7756"/>\n          <rect x="7.9" y="12.2" width="1.4" height="2.8" rx=".3" fill="#DA7756"/>\n          <rect x="12.7" y="12.2" width="1.4" height="2.8" rx=".3" fill="#DA7756"/>\n          <rect x="15.2" y="12.2" width="1.4" height="2.8" rx=".3" fill="#DA7756"/>\n          <rect x="6.6" y="6.4" width="1.35" height="2.6" rx=".2" fill="#FFF"/>\n          <rect x="14.05" y="6.4" width="1.35" height="2.6" rx=".2" fill="#FFF"/>\n        </symbol>\n        <symbol id="en-ic-blender" viewBox="0 0 24 22">\n          <path d="M10.2 3L18.4 9.2M3.8 8.2H14.5M2.4 14.8L10.2 9.4" stroke="#EA7600" stroke-width="2.5" stroke-linecap="round"/>\n          <circle cx="14.6" cy="13.2" r="6.2" fill="#EA7600"/>\n          <circle cx="14.6" cy="13.2" r="3.8" fill="#FFF"/>\n          <circle cx="14.6" cy="13.2" r="2.2" fill="#265787"/>\n        </symbol>\n        <symbol id="en-ic-threejs" viewBox="0 0 22 22">\n          <g stroke="#1E293B" stroke-width="1.35" stroke-linejoin="round" fill="none">\n            <polygon points="3,2.4 19.8,6.8 7.4,19.8"/>\n            <polygon points="11.4,4.6 13.6,13.3 5.2,11.1"/>\n            <line x1="3" y1="2.4" x2="13.6" y2="13.3"/>\n            <line x1="19.8" y1="6.8" x2="5.2" y2="11.1"/>\n            <line x1="7.4" y1="19.8" x2="11.4" y2="4.6"/>\n          </g>\n        </symbol>\n        <symbol id="en-ic-arr" viewBox="0 0 24 12">\n          <line x1="1" y1="6" x2="19" y2="6" stroke="#1E293B" stroke-width="1.6"/>\n          <path d="M16 2.2L22.2 6L16 9.8Z" fill="#1E293B"/>\n        </symbol>\n        <symbol id="en-ic-arr-v" viewBox="0 0 12 20">\n          <line x1="6" y1="1" x2="6" y2="15" stroke="#1E293B" stroke-width="1.5"/>\n          <path d="M2.5 13L6 18.8L9.5 13Z" fill="#1E293B"/>\n        </symbol>\n        <symbol id="en-ic-robot" viewBox="0 0 24 24">\n          <line x1="12" y1="2" x2="12" y2="5.5" stroke="#1E293B" stroke-width="1.6" stroke-linecap="round"/>\n          <circle cx="12" cy="2" r="1.5" fill="#1E293B"/>\n          <rect x="4" y="5.5" width="16" height="13" rx="4" fill="#FFF" stroke="#1E293B" stroke-width="1.6"/>\n          <circle cx="9" cy="11" r="1.5" fill="#1E293B"/>\n          <circle cx="15" cy="11" r="1.5" fill="#1E293B"/>\n          <path d="M8.8 15Q12 17 15.2 15" fill="none" stroke="#1E293B" stroke-width="1.5" stroke-linecap="round"/>\n          <line x1="2" y1="10.5" x2="4" y2="10.5" stroke="#1E293B" stroke-width="1.6" stroke-linecap="round"/>\n          <line x1="20" y1="10.5" x2="22" y2="10.5" stroke="#1E293B" stroke-width="1.6" stroke-linecap="round"/>\n        </symbol>\n        <symbol id="en-ic-robot-rubric" viewBox="0 0 24 24">\n          <line x1="12" y1="2" x2="12" y2="5.5" stroke="#2b5c8f" stroke-width="1.6" stroke-linecap="round"/>\n          <circle cx="12" cy="2" r="1.5" fill="#2b5c8f"/>\n          <rect x="4" y="5.5" width="16" height="13" rx="4" fill="#EFF6FF" stroke="#2b5c8f" stroke-width="1.6"/>\n          <circle cx="9" cy="11" r="1.5" fill="#1E293B"/>\n          <circle cx="15" cy="11" r="1.5" fill="#1E293B"/>\n          <line x1="8.5" y1="15" x2="15.5" y2="15" stroke="#2b5c8f" stroke-width="1.5" stroke-linecap="round"/>\n          <line x1="2" y1="10.5" x2="4" y2="10.5" stroke="#2b5c8f" stroke-width="1.6" stroke-linecap="round"/>\n          <line x1="20" y1="10.5" x2="22" y2="10.5" stroke="#2b5c8f" stroke-width="1.6" stroke-linecap="round"/>\n        </symbol>\n        <symbol id="en-ic-robot-audit" viewBox="0 0 24 24">\n          <line x1="12" y1="2" x2="12" y2="5.5" stroke="#2e6b4e" stroke-width="1.6" stroke-linecap="round"/>\n          <circle cx="12" cy="2" r="1.5" fill="#2e6b4e"/>\n          <rect x="4" y="5.5" width="16" height="13" rx="4" fill="#ECFDF5" stroke="#2e6b4e" stroke-width="1.6"/>\n          <circle cx="9" cy="11" r="1.5" fill="#1E293B"/>\n          <circle cx="15" cy="11" r="1.5" fill="#1E293B"/>\n          <path d="M9 14.8l2 1.8 4-3.4" fill="none" stroke="#2e6b4e" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>\n          <line x1="2" y1="10.5" x2="4" y2="10.5" stroke="#2e6b4e" stroke-width="1.6" stroke-linecap="round"/>\n          <line x1="20" y1="10.5" x2="22" y2="10.5" stroke="#2e6b4e" stroke-width="1.6" stroke-linecap="round"/>\n        </symbol>\n      </defs>\n    </svg>`;
        document.body.append(defs);
    }
    const synthFig = document.querySelector("#method .method-synthesis > .paper-figure");
    if (synthFig) {
        const d1 = document.createElement("div");
        d1.className = "en-synth-board";
        d1.innerHTML = `\n      <div class="en-synth-band">\n        <div class="en-top-grid">\n          <div class="en-unit-col">\n            <h4>Raw Corpora</h4>\n            <div class="en-src-icons">\n              <img src="assets/bmk/method/icon_hf.webp" alt="HuggingFace" width="24" height="24">\n              <img src="assets/bmk/method/icon_amazon.webp" alt="Amazon" width="24" height="24">\n              <img src="assets/bmk/method/icon_wikipedia.webp" alt="Wikipedia" width="24" height="24">\n            </div>\n            <div class="en-hist-wrap">\n              <svg viewBox="0 0 110 74" aria-label="Raw distribution p_raw">\n                <line x1="8" y1="32" x2="104" y2="32" stroke="#64829E" stroke-width="1.2" stroke-dasharray="3.5,2.5"/>\n                <rect x="12" y="10" width="15" height="58" rx="1" fill="url(#en-hist-grad)" stroke="#5B84AA" stroke-width="1.1"/>\n                <rect x="30" y="23" width="15" height="45" rx="1" fill="url(#en-hist-grad)" stroke="#5B84AA" stroke-width="1.1" opacity=".88"/>\n                <rect x="48" y="36" width="15" height="32" rx="1" fill="url(#en-hist-grad)" stroke="#5B84AA" stroke-width="1.1" opacity=".78"/>\n                <rect x="66" y="47" width="15" height="21" rx="1" fill="url(#en-hist-grad)" stroke="#5B84AA" stroke-width="1.1" opacity=".68"/>\n                <rect x="84" y="56" width="15" height="12" rx="1" fill="url(#en-hist-grad)" stroke="#5B84AA" stroke-width="1.1" opacity=".58"/>\n                <line x1="8" y1="4" x2="8" y2="68" stroke="#334155" stroke-width="1.5"/>\n                <line x1="8" y1="68" x2="105" y2="68" stroke="#334155" stroke-width="1.5"/>\n                <text x="72" y="22" font-family="Georgia,serif" font-size="14" font-style="italic" fill="#0f172a">p<tspan dy="3" font-size="10" font-style="normal">raw</tspan></text>\n              </svg>\n            </div>\n          </div>\n\n          <div class="en-arr-h"><svg width="24" height="12"><use href="#en-ic-arr"/></svg></div>\n\n          <div class="en-proc-card">\n            <div class="en-proc-row">\n              <svg viewBox="0 0 20 20"><path d="M2.5 3.5h15l-5.8 6.8v6.2l-3.4-1.8v-4.4z" fill="#F8FAFC" stroke="#334155" stroke-width="1.5" stroke-linejoin="round"/></svg>\n              <span>Deduplication</span>\n            </div>\n            <div class="en-proc-row">\n              <svg viewBox="0 0 20 20"><line x1="10" y1="1.5" x2="10" y2="4.5" stroke="#1E293B" stroke-width="1.4"/><circle cx="10" cy="1.5" r="1.3" fill="#1E293B"/><rect x="3.5" y="4.5" width="13" height="10.5" rx="3.5" fill="#FFF" stroke="#1E293B" stroke-width="1.5"/><circle cx="7.5" cy="9" r="1.2" fill="#1E293B"/><circle cx="12.5" cy="9" r="1.2" fill="#1E293B"/><path d="M7.5 12Q10 13.8 12.5 12" fill="none" stroke="#1E293B" stroke-width="1.3"/></svg>\n              <span>LLM Pre-Tag</span>\n            </div>\n            <div class="en-proc-row">\n              <svg viewBox="0 0 20 20"><path d="M10 17v-6M10 11L4.5 6M10 11l5.5-5M4.5 6V3M10 11V3M15.5 6V3" fill="none" stroke="#335C85" stroke-width="1.6" stroke-linecap="round"/><circle cx="4.5" cy="3" r="1.5" fill="#335C85"/><circle cx="10" cy="3" r="1.5" fill="#335C85"/><circle cx="15.5" cy="3" r="1.5" fill="#335C85"/></svg>\n              <span>Taxonomy Align</span>\n            </div>\n          </div>\n\n          <div class="en-arr-h"><svg width="24" height="12"><use href="#en-ic-arr"/></svg></div>\n\n          <div class="en-unit-col">\n            <h4>Aligned Queries</h4>\n            <div class="en-src-icons">\n              <svg width="26" height="26" viewBox="0 0 24 24"><rect x="6" y="4" width="13" height="16" rx="1.8" fill="#F1F5F9" stroke="#64748B" stroke-width="1.4"/><rect x="4" y="2" width="13" height="16" rx="1.8" fill="#FFF" stroke="#334155" stroke-width="1.5"/><line x1="7" y1="6.5" x2="14" y2="6.5" stroke="#334155" stroke-width="1.4"/><line x1="7" y1="10" x2="14" y2="10" stroke="#334155" stroke-width="1.4"/><line x1="7" y1="13.5" x2="11.5" y2="13.5" stroke="#334155" stroke-width="1.4"/></svg>\n            </div>\n            <div class="en-hist-wrap">\n              <svg viewBox="0 0 110 74" aria-label="Aligned distribution p_3D">\n                <line x1="8" y1="32" x2="104" y2="32" stroke="#64829E" stroke-width="1.2" stroke-dasharray="3.5,2.5"/>\n                <rect x="12" y="34" width="15" height="34" rx="1" fill="url(#en-hist-grad)" stroke="#5B84AA" stroke-width="1.1"/>\n                <rect x="30" y="32" width="15" height="36" rx="1" fill="url(#en-hist-grad)" stroke="#5B84AA" stroke-width="1.1"/>\n                <rect x="48" y="35" width="15" height="33" rx="1" fill="url(#en-hist-grad)" stroke="#5B84AA" stroke-width="1.1"/>\n                <rect x="66" y="33" width="15" height="35" rx="1" fill="url(#en-hist-grad)" stroke="#5B84AA" stroke-width="1.1"/>\n                <rect x="84" y="34" width="15" height="34" rx="1" fill="url(#en-hist-grad)" stroke="#5B84AA" stroke-width="1.1"/>\n                <line x1="8" y1="4" x2="8" y2="68" stroke="#334155" stroke-width="1.5"/>\n                <line x1="8" y1="68" x2="105" y2="68" stroke="#334155" stroke-width="1.5"/>\n                <text x="74" y="22" font-family="Georgia,serif" font-size="14" font-style="italic" fill="#0f172a">p<tspan dy="3" font-size="10" font-style="normal">3D</tspan></text>\n              </svg>\n            </div>\n          </div>\n\n          <div class="en-arr-h"><svg width="24" height="12"><use href="#en-ic-arr"/></svg></div>\n\n          <div class="en-gate-card">\n            <div class="en-gate-left">\n              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="#ECFDF5" stroke="#10A37F" stroke-width="1.6"/><polygon points="12,6.5 16.8,9.2 16.8,14.8 12,17.5 7.2,14.8 7.2,9.2" fill="none" stroke="#10A37F" stroke-width="1.4"/></svg>\n              <b>Image 2.5</b>\n            </div>\n            <div class="en-gate-right">\n              <div class="en-proc-row">\n                <svg viewBox="0 0 20 20"><line x1="2" y1="16" x2="18" y2="16" stroke="#334155" stroke-width="1.4"/><rect x="4" y="10" width="2.8" height="6" fill="#587A99"/><rect x="8.5" y="5" width="2.8" height="11" fill="#587A99"/><rect x="13" y="8" width="2.8" height="8" fill="#587A99"/></svg>\n                <span>Histogram</span>\n              </div>\n              <div class="en-proc-row">\n                <svg viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="1.8" fill="#FFF" stroke="#334155" stroke-width="1.4"/><line x1="8" y1="4" x2="8" y2="16" stroke="#D9534F" stroke-width="1.2" stroke-dasharray="2,1.5"/><circle cx="12.5" cy="10" r="2.2" fill="#334155"/></svg>\n                <span>Saliency</span>\n              </div>\n              <div class="en-proc-row">\n                <svg viewBox="0 0 20 20"><line x1="7.5" y1="4.5" x2="5" y2="1.5" stroke="#334155" stroke-width="1.3"/><line x1="12.5" y1="4.5" x2="15" y2="1.5" stroke="#334155" stroke-width="1.3"/><rect x="3" y="4.5" width="14" height="10.5" rx="1.8" fill="#FFF" stroke="#334155" stroke-width="1.5"/><rect x="5" y="6.8" width="10" height="4.2" rx="1" fill="#334155"/><circle cx="7.8" cy="8.9" r="1.1" fill="#FFF"/><circle cx="12.2" cy="8.9" r="1.1" fill="#FFF"/></svg>\n                <span>VLM Screen</span>\n              </div>\n            </div>\n          </div>\n\n          <div class="en-arr-h"><svg width="24" height="12"><use href="#en-ic-arr"/></svg></div>\n\n          <div class="en-anchor-col">\n            <div class="en-anchor-hdr"><span class="en-chk">✓</span><span>Anchor <i style="font-family:Georgia,serif;font-weight:400">I</i></span></div>\n            <a class="en-anchor-main" href="assets/bmk/method/u7_ref.webp" target="_blank" rel="noopener">\n              <img src="assets/bmk/method/u7_ref.webp" alt="Visual Anchor I" width="450" height="250">\n            </a>\n            <div class="en-anchor-rejs">\n              <figure>\n                <a href="assets/bmk/method/rej_dark.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/rej_dark.webp" alt="Dark rejected" width="240" height="160"></a>\n                <figcaption><span class="en-crs">✕</span>Dark</figcaption>\n              </figure>\n              <figure>\n                <a href="assets/bmk/method/rej_broken.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/rej_broken.webp" alt="Broken rejected" width="240" height="160"></a>\n                <figcaption><span class="en-crs">✕</span>Broken</figcaption>\n              </figure>\n            </div>\n          </div>\n        </div>\n      </div>\n\n      <div class="en-wrap-bridge" aria-hidden="true">\n        <svg viewBox="0 0 1140 34" preserveAspectRatio="none">\n          <path d="M 1015 0 L 1015 17 Q 1015 23 1005 23 L 78 23 Q 68 23 68 29 L 68 33" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5,3.5"/>\n          <polygon points="68,35 63.5,27.5 72.5,27.5" fill="#64748b"/>\n        </svg>\n        <div class="en-wrap-pill">\n          <span>Visual Anchor <i>I</i></span>\n          <span>→</span>\n          <span>Multi-Agent Task &amp; Rubric Synthesis</span>\n        </div>\n      </div>\n\n      <div class="en-synth-band" style="margin-top:4px;padding-top:8px;border-top:0">\n        <div class="en-bot-grid">\n          <div class="en-v2-col1">\n            <div class="en-v2-anchor-box">\n              <div class="en-v2-anchor-hdr"><span class="en-chk" style="width:13px;height:13px;font-size:9px">✓</span><span>Input Anchor <i style="font-family:Georgia,serif;font-weight:400">I</i></span></div>\n              <a class="en-v2-anchor-img" href="assets/bmk/method/u7_ref.webp" target="_blank" rel="noopener">\n                <img src="assets/bmk/method/u7_ref.webp" alt="Input Anchor I" width="225" height="125">\n              </a>\n            </div>\n            <div class="en-v2-down">\n              <svg width="12" height="16" viewBox="0 0 12 16"><line x1="6" y1="1" x2="6" y2="11" stroke="#334155" stroke-width="1.5"/><polygon points="6,15 2.5,9.5 9.5,9.5" fill="#334155"/></svg>\n              <span>Decompose</span>\n            </div>\n            <div class="en-v2-reqbot">\n              <svg><use href="#en-ic-robot"/></svg>\n              <div>\n                <b>Req. Agent</b>\n                <span><i>I</i> → (<i>C, S, F</i>)</span>\n              </div>\n            </div>\n          </div>\n\n          <div class="en-arr-h"><svg width="20" height="12"><use href="#en-ic-arr"/></svg></div>\n\n          <div class="en-csf-col">\n            <div class="en-csf-item">\n              <div class="en-csf-icon"><code>&lt;/&gt;</code><small>.html</small></div>\n              <div class="en-csf-text">\n                <h5>Context (<i>C</i>)</h5>\n                <p>Scenario and Deliverable</p>\n              </div>\n            </div>\n            <div class="en-csf-item">\n              <a class="en-csf-icon" href="assets/bmk/method/csf_spec.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/csf_spec.webp" alt="Specification S" width="160" height="160"></a>\n              <div class="en-csf-text">\n                <h5>Specification (<i>S</i>)</h5>\n                <p>Structure, Scale and Mesh</p>\n              </div>\n            </div>\n            <div class="en-csf-item">\n              <a class="en-csf-icon" href="assets/bmk/method/csf_func.webp" target="_blank" rel="noopener">\n                <img src="assets/bmk/method/csf_func.webp" alt="Function F" width="160" height="160">\n                <span class="en-slider-bar"><i><b></b></i></span>\n              </a>\n              <div class="en-csf-text">\n                <h5>Function (<i>F</i>)</h5>\n                <p>Trigger, Target and State</p>\n              </div>\n            </div>\n          </div>\n\n          <div class="en-arr-h"><svg width="20" height="12"><use href="#en-ic-arr"/></svg></div>\n\n          <div class="en-bot-gate-card">\n            <div class="en-bot-gate-left">\n              <svg><use href="#en-ic-robot-rubric"/></svg>\n              <b>Rubric<br>Agent</b>\n            </div>\n            <div class="en-bot-gate-right">\n              <div class="en-proc-row">\n                <svg viewBox="0 0 20 20"><path d="M3 5h14M3 10h10M3 15h7" stroke="#2b5c8f" stroke-width="1.6" stroke-linecap="round"/></svg>\n                <span>Criteria Tree</span>\n              </div>\n              <div class="en-proc-row">\n                <svg viewBox="0 0 20 20"><rect x="2" y="6" width="4.5" height="8" rx="1" fill="#fbe9e7" stroke="#a63a2b" stroke-width="1.2"/><rect x="7.8" y="4" width="4.5" height="10" rx="1" fill="#fdf3e7" stroke="#9a5b13" stroke-width="1.2"/><rect x="13.5" y="2" width="4.5" height="12" rx="1" fill="#ebf3ee" stroke="#2e6b4e" stroke-width="1.2"/></svg>\n                <span>Tier Anchors</span>\n              </div>\n              <div class="en-proc-row">\n                <svg viewBox="0 0 20 20"><path d="M3 15l4-5 4 3 6-8" fill="none" stroke="#334155" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>\n                <span>Prior Est.</span>\n              </div>\n            </div>\n          </div>\n\n          <div class="en-arr-h"><svg width="20" height="12"><use href="#en-ic-arr"/></svg></div>\n\n          <div class="en-rubric-box">\n            <div class="en-rubric-hdr">\n              <h5>Rubrics (<i>R</i>)</h5>\n              <div class="en-score-tiers">\n                <span class="en-tier-0">0</span>\n                <span class="en-tier-05">0.5</span>\n                <span class="en-tier-1">1</span>\n              </div>\n            </div>\n            <div class="en-rubric-item">\n              <strong>Visual Rubric (<i>R</i><sub>vis</sub>)</strong>\n              <span>Global Layout to Local Detail</span>\n            </div>\n            <div class="en-rubric-item">\n              <strong>Specification Rubric (<i>R</i><sub>spec</sub>)</strong>\n              <span>Scale, Structure and Delivery</span>\n            </div>\n            <div class="en-rubric-item">\n              <strong>Function Rubric (<i>R</i><sub>func</sub>)</strong>\n              <span>Trigger Action and Response</span>\n            </div>\n            <div class="en-rubric-item is-prior">\n              <strong>Prior Difficulty</strong>\n              <span>Scene Scale and Complexity</span>\n            </div>\n          </div>\n\n          <div class="en-arr-h"><svg width="20" height="12"><use href="#en-ic-arr"/></svg></div>\n\n          <div class="en-bot-gate-card">\n            <div class="en-bot-gate-left">\n              <svg><use href="#en-ic-robot-audit"/></svg>\n              <b>Audit<br>Agent</b>\n            </div>\n            <div class="en-bot-gate-right">\n              <div class="en-proc-row">\n                <svg viewBox="0 0 20 20"><path d="M4 10h12M10 4v12" stroke="#2e6b4e" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="10" r="6.5" fill="none" stroke="#334155" stroke-width="1.4"/></svg>\n                <span><i>I–S–F</i> Align</span>\n              </div>\n              <div class="en-proc-row">\n                <svg viewBox="0 0 20 20"><path d="M4 10.5l4 4 8-8.5" fill="none" stroke="#2e6b4e" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>\n                <span>Verifiability</span>\n              </div>\n              <div class="en-proc-row">\n                <svg viewBox="0 0 20 20"><path d="M10 2.5l6.5 2.8v4.8c0 4.2-2.8 7.4-6.5 8.9-3.7-1.5-6.5-4.7-6.5-8.9V5.3z" fill="#ebf3ee" stroke="#2e6b4e" stroke-width="1.4"/></svg>\n                <span>Audit Gate</span>\n              </div>\n            </div>\n          </div>\n\n          <div class="en-arr-h"><svg width="20" height="12"><use href="#en-ic-arr"/></svg></div>\n\n          <div class="en-pkg-box">\n            <h5><span class="en-chk">✓</span><span>Task Package</span></h5>\n            <div class="en-pkg-subcard">\n              <strong>Agent Input</strong>\n              <p><i>x</i> = (<i>I, C, S, F</i>)</p>\n              <small>To 3D Coding Agent</small>\n            </div>\n            <div class="en-pkg-subcard">\n              <strong>Eval Verifier</strong>\n              <p>Rubrics <i>R</i></p>\n              <small>To VLM &amp; Script Judge</small>\n            </div>\n          </div>\n        </div>\n      </div>\n    `;
        synthFig.replaceWith(d1);
    }
    const rolloutFig = document.querySelector("#method .figure-pair > article.stage-card .paper-figure");
    if (rolloutFig) {
        const d2 = document.createElement("div");
        d2.className = "en-rollout-board";
        d2.innerHTML = `\n      <div class="en-rollout-grid">\n        \n        <div class="en-r-card">\n          <h4>Task Input</h4>\n          <div class="en-c1-top">\n            <a href="assets/bmk/method/u7_ref.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/u7_ref.webp" alt="Input Reference I" width="160" height="114"></a>\n            <div class="en-c1-meta">\n              <strong><i>x</i> = (<i>I, C, S, F</i>)</strong>\n              <span>Modes: Replica, Design, Interact</span>\n              <span>Output: .html, .blend, .glb, ...</span>\n            </div>\n          </div>\n          <div class="en-c1-stack">\n            <div class="en-subbox">\n              <h5><span>Context (<i>C</i>)</span></h5>\n              <p>Build a Three.js interior preview of the Baroque Hall of Mirrors for museum renovation review...</p>\n            </div>\n            <div class="en-subbox">\n              <h5><span>Specification (<i>S</i>)</span></h5>\n              <ul>\n                <li>18.0 × 8.2 × 7.8 m hall with barrel-vaulted ceiling</li>\n                <li>6 crystal chandeliers, 12 gilded pilasters</li>\n                <li>Gold leaf (M=1.0, R=0.18), polished marble tiles</li>\n                <li>24 mm main camera at 1.65 m eye height</li>\n              </ul>\n            </div>\n            <div class="en-subbox">\n              <h5><span>Function (<i>F</i>)</span></h5>\n              <ul>\n                <li>F1: Adjust sunlight elevation and bloom intensity</li>\n                <li>F2: Switch between main and close-up views</li>\n                <li>F3: Open or close the arched mirror doors</li>\n              </ul>\n            </div>\n          </div>\n        </div>\n\n        <div class="en-arr-h"><svg width="20" height="12"><use href="#en-ic-arr"/></svg></div>\n\n        \n        <div class="en-r-card">\n          <h4>Sandbox Rollout</h4>\n          <div class="en-subbox" style="flex:1;display:flex;flex-direction:column;justify-content:flex-start">\n            <div>\n              <h5><span>Rollout Environment</span></h5>\n              <div class="en-env-grid">\n                <div class="en-env-chip"><svg><use href="#en-ic-deepseek"/></svg><span>DeepSeek-V4.1-Flash</span></div>\n                <div class="en-env-chip"><svg><use href="#en-ic-claude"/></svg><span>Claude Code 2.1.251</span></div>\n                <div class="en-env-chip"><svg><use href="#en-ic-blender"/></svg><span>Blender 4.2.10</span></div>\n                <div class="en-env-chip"><svg><use href="#en-ic-threejs"/></svg><span>Three.js r180, ...</span></div>\n              </div>\n            </div>\n            <div class="en-act-split">\n              <div>\n                <strong style="display:block;font-size:11px;margin-bottom:4px">Sandbox Actions</strong>\n                <div class="en-code-lines">\n                  <span>execute_scene_code</span>\n                  <span>get_scene_hierarchy</span>\n                  <span>capture_viewport</span>\n                  <span>trigger_ui_control</span>\n                  <span>...</span>\n                </div>\n                <div class="en-lib-sec">\n                  <strong>Libraries</strong>\n                  <p>Python bpy, Playwright,<br>WebGL, trimesh, ...</p>\n                </div>\n              </div>\n              <div class="en-drf-col">\n                <div class="en-drf-row"><span>Draft</span><a href="assets/bmk/method/roll_draft.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/roll_draft.webp" alt="Draft" width="92" height="62"></a></div>\n                <div class="en-drf-arr">↓</div>\n                <div class="en-drf-row"><span>Refine</span><a href="assets/bmk/method/roll_refine.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/roll_refine.webp" alt="Refine" width="92" height="62"></a></div>\n                <div class="en-drf-arr">↓</div>\n                <div class="en-drf-row"><span>Final</span><a href="assets/bmk/method/roll_final.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/roll_final.webp" alt="Final" width="92" height="62"></a></div>\n              </div>\n            </div>\n          </div>\n          <div class="en-arr-v"><svg width="12" height="16"><use href="#en-ic-arr-v"/></svg></div>\n          <div class="en-subbox">\n            <h5 style="justify-content:center"><span>Deliverables (<i>P</i><sub>T</sub>, τ)</span></h5>\n            <div class="en-deliv-grid">\n              <div class="en-deliv-item">\n                <div class="en-deliv-icon"><svg width="20" height="16" viewBox="0 0 20 16"><path d="M1.5 3h6l1.8 2h9.2v9.5H1.5z" fill="#E8EEF5" stroke="#475569" stroke-width="1.3"/></svg></div>\n                <span>Workspace</span>\n              </div>\n              <div class="en-deliv-item">\n                <div class="en-deliv-icon"><svg width="14" height="14"><use href="#en-ic-blender"/></svg><svg width="13" height="13"><use href="#en-ic-threejs"/></svg></div>\n                <span>.glb, .html</span>\n              </div>\n              <div class="en-deliv-item">\n                <div class="en-deliv-icon"><img src="assets/bmk/method/roll_final.webp" alt="Images" width="56" height="40"></div>\n                <span>Images</span>\n              </div>\n              <div class="en-deliv-item">\n                <div class="en-deliv-icon"><svg width="20" height="16" viewBox="0 0 20 16"><rect x="1.5" y="1.5" width="17" height="13" rx="2" fill="#FFF" stroke="#475569" stroke-width="1.3"/><path d="M5 5.5L8 8L5 10.5M9.5 10.5H14" fill="none" stroke="#1E293B" stroke-width="1.3" stroke-linecap="round"/></svg></div>\n                <span>Trajectory</span>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <div class="en-arr-h"><svg width="20" height="12"><use href="#en-ic-arr"/></svg></div>\n\n        \n        <div class="en-r-card">\n          <h4>Agentic Verification</h4>\n          <div class="en-subbox" style="flex:1;display:flex;flex-direction:column;justify-content:space-between">\n            <div class="en-c3-top">\n              <div class="en-cam-col">\n                <h5><span>Camera Capture</span></h5>\n                <code>rotate_cam, zoom_in, capture_view, ...</code>\n                <div class="en-cam-matrix">\n                  <div class="en-cam-row"><span>Reference</span><div class="en-cam-thumbs"><a href="assets/bmk/method/cam_ref.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/cam_ref.webp" alt="Reference"></a></div></div>\n                  <div class="en-cam-row"><span>Global</span><div class="en-cam-thumbs"><a href="assets/bmk/method/cam_glb1.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/cam_glb1.webp" alt="Global 1"></a><a href="assets/bmk/method/cam_glb2.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/cam_glb2.webp" alt="Global 2"></a><a href="assets/bmk/method/cam_glb3.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/cam_glb3.webp" alt="Global 3"></a></div></div>\n                  <div class="en-cam-row"><span>Target</span><div class="en-cam-thumbs"><a href="assets/bmk/method/cam_tgt1.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/cam_tgt1.webp" alt="Target 1"></a><a href="assets/bmk/method/cam_tgt2.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/cam_tgt2.webp" alt="Target 2"></a><a href="assets/bmk/method/cam_tgt3.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/cam_tgt3.webp" alt="Target 3"></a></div></div>\n                  <div class="en-cam-row"><span>Detail</span><div class="en-cam-thumbs"><a href="assets/bmk/method/cam_det1.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/cam_det1.webp" alt="Detail 1"></a><a href="assets/bmk/method/cam_det2.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/cam_det2.webp" alt="Detail 2"></a><a href="assets/bmk/method/cam_det3.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/cam_det3.webp" alt="Detail 3"></a></div></div>\n                </div>\n              </div>\n\n              <div class="en-vj-col">\n                <h5><span>Visual Judge <small style="font-weight:400;color:#475569">(Isolated VLM)</small></span><span style="font-weight:400;font-size:10px">Calibrated Score: <i>s</i><sub>vis</sub></span></h5>\n                <div class="en-vj-split">\n                  <div class="en-vj-pane">\n                    <h6>Rubric Score</h6>\n                    <div class="en-chk-list">\n                      <div class="en-chk-row"><span class="en-chk">✓</span><span>Vaulted 5-bay hall</span></div>\n                      <div class="en-chk-row"><span class="en-chk">✓</span><span>Chandeliers (×6)</span></div>\n                      <div class="en-chk-row"><span class="en-crs">✕</span><span>Floor reflection</span></div>\n                      <div>...</div>\n                    </div>\n                    <div class="en-score-foot">Rubric Score: <i>s</i><sub>vis,rub</sub></div>\n                  </div>\n                  <div class="en-vj-pane">\n                    <h6>Aesthetic Score</h6>\n                    <div class="en-chk-list">\n                      <div class="en-aes-row"><span>Layout and form</span><span>1–5</span></div>\n                      <div class="en-aes-row"><span>Material realism</span><span>1–5</span></div>\n                      <div class="en-aes-row"><span>Light and mood</span><span>1–5</span></div>\n                      <div>...</div>\n                    </div>\n                    <div class="en-score-foot">Aesthetic Score: <i>s</i><sub>vis,aes</sub></div>\n                  </div>\n                </div>\n              </div>\n            </div>\n          </div>\n\n          <div class="en-c3-bot">\n            <div class="en-subbox" style="display:flex;flex-direction:column;justify-content:space-between">\n              <div>\n                <h5><span>Specification Judge</span></h5>\n                <div class="en-chk-list">\n                  <div class="en-chk-row"><span class="en-chk">✓</span><span>4,567 3D meshes verified</span></div>\n                  <div class="en-chk-row"><span class="en-chk">✓</span><span>18.0 × 8.2 m BBox scale match</span></div>\n                  <div class="en-chk-row"><span class="en-chk">✓</span><span>12 pilasters, 6 chandeliers</span></div>\n                  <div>...</div>\n                </div>\n              </div>\n              <div class="en-score-foot">Specification Score: <i>s</i><sub>spec</sub></div>\n            </div>\n\n            <div class="en-subbox" style="display:flex;flex-direction:column;justify-content:space-between">\n              <div>\n                <h5><span>Function Judge</span></h5>\n                <div class="en-fn-body">\n                  <div class="en-fn-pair">\n                    <div><a href="assets/bmk/method/fn_init.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/fn_init.webp" alt="Init"></a><span>Init</span></div>\n                    <span>→</span>\n                    <div><a href="assets/bmk/method/fn_trig.webp" target="_blank" rel="noopener"><img src="assets/bmk/method/fn_trig.webp" alt="Triggered"></a><span>Triggered</span></div>\n                  </div>\n                  <div class="en-chk-list">\n                    <div class="en-chk-row"><span class="en-chk">✓</span><span>F1: Sunbeam toggle</span></div>\n                    <div class="en-chk-row"><span class="en-chk">✓</span><span>F2: Camera switch</span></div>\n                    <div class="en-chk-row"><span class="en-crs">✕</span><span>F3: Door hinge clip</span></div>\n                    <div>...</div>\n                  </div>\n                </div>\n              </div>\n              <div class="en-score-foot">Function Score: <i>s</i><sub>func</sub></div>\n            </div>\n          </div>\n        </div>\n\n        <div class="en-arr-h"><svg width="20" height="12"><use href="#en-ic-arr"/></svg></div>\n\n        \n        <div class="en-r-card">\n          <h4>Filtering and Curation</h4>\n          <div class="en-subbox" style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:6px">\n            <h5 style="justify-content:center;margin-bottom:2px"><span>Conjunctive Audit Gate</span></h5>\n            <div class="en-gate-rows">\n              <div class="en-gate-row"><span>Visual score <i class="en-r-math">s</i><sub>vis</sub></span><span>≥</span><span>γ<sub>vis</sub></span></div>\n              <div class="en-gate-row"><span>Spec score <i class="en-r-math">s</i><sub>spec</sub></span><span>≥</span><span>γ<sub>spec</sub></span></div>\n              <div class="en-gate-row"><span>Func score <i class="en-r-math">s</i><sub>func</sub></span><span>≥</span><span>γ<sub>func</sub></span></div>\n            </div>\n            <div class="en-chk-list" style="gap:7px">\n              <div class="en-chk-row"><span class="en-crs">✕</span><span><b>Fail:</b> Re-Rollout (<i class="en-r-math">N</i><sub>max</sub> = 6)</span></div>\n              <div class="en-chk-row"><span class="en-chk">✓</span><span><b>Pass:</b> Admit τ to dataset</span></div>\n            </div>\n          </div>\n\n          <div class="en-arr-v"><svg width="12" height="16"><use href="#en-ic-arr-v"/></svg></div>\n\n          <div class="en-subbox">\n            <h5 style="justify-content:center"><span>3DCodeFactory-Data</span></h5>\n            <div class="en-data-grid">\n              <div class="en-data-cell"><strong>5,045</strong><span>Trajectories</span></div>\n              <div class="en-data-cell"><strong>5.52B</strong><span>Tokens (1.09M/τ)</span></div>\n              <div class="en-data-cell"><svg width="13" height="13"><use href="#en-ic-blender"/></svg><span>57.9%</span></div>\n              <div class="en-data-cell"><svg width="12" height="12"><use href="#en-ic-threejs"/></svg><span>42.1%</span></div>\n            </div>\n            <div style="text-align:center;font-size:9.8px;color:#0f172a">Loss-masked multimodal SFT</div>\n          </div>\n        </div>\n      </div>\n    `;
        rolloutFig.replaceWith(d2);
    }
})();
