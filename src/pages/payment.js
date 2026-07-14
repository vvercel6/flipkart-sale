import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Head from "next/head";

const Payments = () => {
    const router = useRouter();

    const [products, setProducts] = useState({ id: "", Gpay: true });
    const [data133, setdata133] = useState([]);
    const [time, setTime] = useState(900);
    const [activeTab, setActiveTab] = useState(3);
    const [payment, setPayment] = useState("");
    const [mounted, setMounted] = useState(false);

    // Fix hydration - only render after mount
    useEffect(() => {
        setMounted(true);
    }, []);

    // Timer
    useEffect(() => {
        if (time <= 0) return;
        const timer = setInterval(() => {
            setTime((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Load cart from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem("cart");
            if (stored) {
                try {
                    setdata133(JSON.parse(stored));
                } catch (error) {
                    console.error("Error parsing cart:", error);
                }
            }
        }
    }, []);

    // Calculate total
    const totalMrp = data133.reduce(
        (sum, product) => sum + parseInt(product.sellingPrice * product.quantity || 0),
        0
    );

    const handleTabClick = (tabNumber) => setActiveTab(tabNumber);

    // Fetch settings
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await fetch("/api/settings", {
                method: "GET",
                headers: {
                    Accept: "*/*",
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const data = await response.json();
                setProducts(data.data.upi || { id: "", Gpay: true });

                // Set default active tab based on available payment methods
                setActiveTab(
                    data.data.upi?.Gpay === false
                        ? data.data.upi?.Phonepe === false
                            ? 4
                            : 3
                        : 2
                );
            } else {
                console.error("Error fetching settings:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        }
    };

    // Generate payment links
    useEffect(() => {
        if (!products?.id || !mounted) return;

        const upiId = products.id;
        const amount = Number(totalMrp);
        const txn_id = `TXN${Date.now()}`;
        let redirect_url = "";

        // Paytm
        const payload = {
            contact: {
                cbsName: "Store",
                nickName: "Payment",
                vpa: upiId,
                type: "VPA"
            },
            p2pPaymentCheckoutParams: {
                note: txn_id,
                isByDefaultKnownContact: true,
                enableSpeechToText: false,
                allowAmountEdit: false,
                showQrCodeOption: false,
                disableViewHistory: true,
                shouldShowUnsavedContactBanner: false,
                isRecurring: false,
                checkoutType: "DEFAULT",
                transactionContext: "p2p",
                initialAmount: amount * 100,
                disableNotesEdit: true,
                showKeyboard: true,
                currency: "INR",
                shouldShowMaskedNumber: true
            }
        };

        const jsonString = JSON.stringify(payload);
        const base64Data = btoa(jsonString);
        redirect_url = "phonepe://native?data=" + base64Data + "&id=p2ppayment";

        switch (activeTab) {
            case 4: {
                redirect_url = `paytmmp://pay?pa=${upiId}&pn=Store&am=${amount}&tr=${txn_id}&cu=INR`;
                setPayment(redirect_url);
                break;
            }
            case 1:
                // BHIM UPI
                redirect_url = `bhim://pay?pa=${upiId}&pn=Store&am=${amount}&tr=${txn_id}&mc=8931&cu=INR&tn=Payment`;
                setPayment(redirect_url);
                break;
            case 2:
                setPayment(redirect_url);
                break;
            case 3:
                // PhonePe
                setPayment(redirect_url);
                break;
            case 5:
                // WhatsApp Pay
                redirect_url = `whatsapp://pay?pa=${upiId}&pn=Store&am=${amount}&tr=${txn_id}&mc=8931&cu=INR&tn=Payment`;
                setPayment(redirect_url);
                break;
            default:
                break;
        }
    }, [activeTab, products?.id, totalMrp, mounted]);

    const minutes = Math.floor(time / 60);
    const seconds = time % 60;

    // Don't render until mounted to avoid hydration errors
    if (!mounted) {
        return null;
    }

    return (
        <>
            <Head>
                <title>Payment - Online Shopping</title>
                <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="viewport" content="width=device-width,minimum-scale=1,user-scalable=no" />
                <meta name="theme-color" content="#ffc200" />
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
                    integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link href="https://fonts.googleapis.com/css2?family=Poppins&display=swap" rel="stylesheet" />
            </Head>

            <style jsx global>{`
                body, a, p, span, div, input, button, h1, h2, h3, h4, h5, h6 {
                    font-family: 'Poppins', sans-serif !important;
                }
                
                .cart_page_footer {
                    box-shadow: none;
                    position: fixed;
                    bottom: 80px;
                }

                .header-menu {
                    display: none;
                }

                .cart-list {
                    max-height: max-content;
                }

                ._1fhgRH {
                    margin-bottom: 250px;
                }

                .gNFCeh {
                    display: flex;
                    justify-content: space-between;
                    padding: 16px 16px 18px;
                    background-color: #FFFFFF;
                }

                .hEBjyt {
                    color: rgb(53, 53, 67);
                    font-weight: 700;
                    font-size: 17px;
                    line-height: 20px;
                    margin: 0;
                }

                .cHsEym {
                    padding: 0px 16px 18px;
                    background-color: #FFFFFF;
                }

                .efQsfx {
                    display: flex;
                    align-items: center;
                    justify-content: start;
                    border-radius: 4px;
                    background-color: rgb(231, 238, 255);
                    padding: 6px 12px;
                    gap: 10px;
                }

                .cOCnuI {
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    flex-direction: column;
                    max-height: 50px;
                    border-radius: 4px;
                    background-color: rgb(231, 238, 255);
                }

                .eNkLGR {
                    color: rgb(159, 32, 137);
                    font-weight: 600;
                    font-size: 15px;
                    line-height: 20px;
                }

                .RrifI {
                    color: rgb(85, 133, 248);
                }

                .GmPbS {
                    padding: 6px 16px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background-color: #FFFFFF;
                }

                .GmPbS span {
                    font-weight: 600;
                    font-size: 10px;
                }

                .GmPbS div {
                    height: 1px;
                    background-color: rgb(206, 206, 222);
                    flex-grow: 1;
                }

                .cart__footer {
                    position: unset;
                    box-shadow: unset;
                    border-top: 5px solid #eaeaf2;
                    border-bottom: 5px solid #eaeaf2;
                }

                .eGwEyP {
                    padding: 12px 16px;
                    display: flex;
                    justify-content: space-between;
                }

                .dUijPM {
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    max-width: 50%;
                    padding-right: 8px;
                }

                .dUijPM span {
                    color: rgb(53, 53, 67);
                    font-weight: 700;
                    font-size: 17px;
                    line-height: 20px;
                }

                .ylmAj {
                    color: rgb(159, 32, 137);
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 700;
                    line-height: 16px;
                    border-radius: 4px;
                    background: inherit;
                    border: none;
                    padding: 0;
                }

                .iAFVK {
                    width: 50%;
                    background: #FFC107;
                    color: rgb(0, 0, 0);
                }

                .iAFVK button,
                .iAFVK a {
                    width: 100%;
                    font-weight: 600;
                }

                .bwHzRF {
                    cursor: pointer;
                    font-size: 15px;
                    line-height: 20px;
                    border-radius: 4px;
                    color: rgb(0, 0, 0) !;
                    background: #FFC107
                    border: none;
                    padding: 12px;
                    font-weight: 500;
                    width: 100%;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .ixHOyU {
                    position: fixed;
                    width: 100%;
                    max-width: 800px;
                    background-color: rgb(255, 255, 255);
                    bottom: 0;
                    z-index: 1;
                }

                .IhlWp {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 2px solid rgb(85, 133, 248);
                    color: rgb(85, 133, 248);
                    font-size: 11px;
                    font-weight: 700;
                    background-color: rgb(85, 133, 248);
                }

                .accordion {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .accordion-item {
                    background: #fff;
                    border-bottom: 1px solid #eaeaf2;
                }

                .accordion-thumb {
                    padding: 16px;
                    margin: 0;
                    cursor: pointer;
                }

                .accordion-panel {
                    padding: 16px;
                }

                .plans {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                }

                .form-check {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 12px 8px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .form-check.active {
                    border-color: #ffc200;
                    background-color: #fdf3fc;
                }

                .form-check-label {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }

                .pay-logo {
                    width: 40px;
                    height: 40px;
                    object-fit: contain;
                }

                .unaviablee {
                    font-size: 12px;
                    font-weight: 500;
                }

                .cart__price__details {
                    padding: 16px;
                }

                .cart__breakup__inner {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .shipping__total,
                .cart__total,
                .mc_pay__total {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .cartTotalAmount {
                    font-weight: 700;
                    color: #353543;
                }

                ._2dxSCm {
                    min-height: 100vh;
                    background: #f9f9f9;
                }

                ._3CzzrP {
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    background: #fff;
                }

                ._38U37R {
                    background: #ffc200;
                    color: #fff;
                }

                ._1FWdmb {
                    background: #fff;
                    padding: 8px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                ._3NH1qf {
                    padding: 8px;
                    cursor: pointer;
                }

                .header-title {
                    margin: 0 0 0 12px;
                    font-size: 16px;
                    font-weight: 600;
                }

                .sc-bBXxYQ {
                    height: 8px;
                    background: #eaeaf2;
                }

                .sc-geuGuN {
                    background: #fff;
                    padding: 16px;
                }

                .sc-bAKPPm {
                    display: flex;
                    justify-content: space-between;
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .sc-jZiqTT {
                    flex: 1;
                    text-align: center;
                }

                .sc-bxSTMQ {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 8px;
                }

                .sc-PJClH,
                .sc-jfdOKL {
                    height: 2px;
                    flex: 1;
                    background: #ccc;
                }

                .sc-PJClH.kHHhBS,
                .sc-jfdOKL.bSausD {
                    background: #5585f8;
                }

                .sc-dGHKFW {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid #ccc;
                    background: #fff;
                    font-size: 11px;
                    font-weight: 700;
                }

                .sc-dGHKFW.cRaGaC {
                    border-color: #5585f8;
                    color: #5585f8;
                }

                .sc-jWquRx {
                    font-size: 12px;
                    color: #666;
                }

                .sc-jWquRx.iefUco {
                    color: #5585f8;
                    font-weight: 600;
                }
            `}</style>

            <div id="container">
                <div className="_2dxSCm">
                    <div className="_3CzzrP">
                        <div className="_38U37R">
                            <div className="_1FWdmb">
                                <div className="d-flex align-items-center">
                                    <button
                                        className="_3NH1qf"
                                        onClick={() => router.back()}
                                        style={{ background: 'none', border: 'none', color: '#000' }}
                                    >
                                        <svg width={25} height={25} viewBox="0 0 20 20" fill="none">
                                            <path d="M13.7461 2.31408C13.5687 2.113 13.3277 2 13.0765 2C12.8252 2 12.5843 2.113 12.4068 2.31408L6.27783 9.24294C5.90739 9.66174 5.90739 10.3382 6.27783 10.757L12.4068 17.6859C12.7773 18.1047 13.3757 18.1047 13.7461 17.6859C14.1166 17.2671 14.0511 16.5166 13.7461 16.1718L8.29154 9.99462L13.7461 3.82817C13.9684 3.57691 14.1071 2.72213 13.7461 2.31408Z" fill="#000" />
                                        </svg>
                                    </button>
                                    <h4 className="header-title">Payment</h4>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="sc-bBXxYQ" />

                    <div className="_1fhgRH">
                        {/* Stepper */}
                         <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .addr-page { background: #fff; min-height: 100vh; font-family: 'Poppins', sans-serif; }

        /* Header */
        .addr-header {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 16px; border-bottom: 1px solid #eaeaf2;
          position: sticky; top: 0; background: #fff; z-index: 10;
        }
        .addr-header h4 {
          font-size: 15px; font-weight: 700; color: #222; margin: 0;
        }
        .back-btn { display: flex; align-items: center; text-decoration: none; }

        /* Stepper */
        .stepper {
          display: flex; justify-content: center; align-items: center;
          gap: 0; padding: 14px 16px; border-bottom: 1px solid #eaeaf2;
          background: #fff;
        }
        .step { display: flex; flex-direction: column; align-items: center; flex: 1; }
        .step-circle {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; border: 2px solid #ddd;
          background: #fff; color: #999; z-index: 1; position: relative;
        }
        .step-circle.done { background: #5585F8; border-color: #5585F8; color: #fff; }
        .step-circle.active { background: #ffc200; border-color: #ffc200; color: #fff; }
        .step-label { font-size: 10px; margin-top: 4px; color: #999; font-weight: 500; }
        .step-label.active { color: #ffc200; font-weight: 700; }
        .step-label.done { color: #5585F8; font-weight: 600; }
        .step-line { flex: 1; height: 2px; background: #eaeaf2; margin-top: -14px; }
        .step-line.done { background: #5585F8; }

        /* Body */
        .addr-body { padding: 0 16px 120px; }

        /* Section heading */
        .section-heading {
          display: flex; align-items: center; gap: 8px;
          padding: 16px 0 12px; font-size: 15px;
          font-weight: 700; color: #353543;
        }

        /* Location button */
        .location-btn {
          display: flex; align-items: center; justify-content: center;
          gap: 8px; width: 100%; padding: 11px 14px;
          border: 1.5px dashed #ffc200; border-radius: 8px;
          background: #fdf3fc; color: #ffc200; font-size: 13px;
          font-weight: 600; cursor: pointer; margin-bottom: 14px;
          transition: background 0.2s; font-family: inherit;
        }
        .location-btn:hover:not(:disabled) { background: #f7e0f5; }
        .location-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .location-error {
          font-size: 11px; color: #d32f2f;
          margin: -8px 0 12px; padding: 0 2px;
        }

        /* Divider */
        .or-divider {
          display: flex; align-items: center; gap: 10px;
          color: #bbb; font-size: 11px; margin: 0 0 14px;
        }
        .or-divider::before, .or-divider::after {
          content: ''; flex: 1; height: 1px; background: #eaeaf2;
        }

        /* Fields */
        .form-floating { margin-bottom: 10px; position: relative; }
        .form-floating > .form-control,
        .form-floating > .form-select {
          height: 52px; font-size: 13px;
          padding-top: 18px; padding-bottom: 4px;
          font-family: inherit;
        }
        .form-floating > label {
          font-size: 12px; padding-top: 10px; color: #888;
        }
        .form-floating > .form-control:focus,
        .form-floating > .form-select:focus {
          border-color: #ffc200;
          box-shadow: 0 0 0 0.15rem rgba(159,32,137,0.15);
          outline: none;
        }
        .form-floating > .form-control.is-invalid,
        .form-floating > .form-select.is-invalid {
          border-color: #d32f2f;
          box-shadow: none;
        }
        .form-floating > .form-control.is-valid,
        .form-floating > .form-select.is-valid {
          border-color: #2e7d32;
          box-shadow: none;
        }

        .field-error {
          font-size: 11px; color: #d32f2f;
          margin-top: 3px; padding-left: 2px;
        }

        /* Row (city + state) */
        .two-col { display: flex; gap: 10px; margin-bottom: 10px; }
        .two-col .form-floating { flex: 1; margin-bottom: 0; }

        /* Footer CTA */
        .addr-footer {
          position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
          width: 100%; max-width: 800px;
          background: #fff; padding: 10px 16px 14px;
          border-top: 1px solid #eaeaf2; z-index: 10;
        }
        .save-btn {
          display: flex; align-items: center; justify-content: center;
          width: 100%; height: 52px; border: none; border-radius: 6px;
          background: #ffc200; color: #000000; font-size: 15px;
          font-weight: 700; cursor: pointer; font-family: inherit;
          letter-spacing: 0.01em; transition: background 0.2s;
        }
        .save-btn:hover:not(:disabled) { background: #ffc200; }
        .save-btn:disabled { opacity: 0.65; cursor: not-allowed; }
      `}</style>
        {/* ── Stepper ── */}
        <div className="stepper">
          <div className="step">
            <div className="step-circle done">✓</div>
            <div className="step-label done">Cart</div>
          </div>
          <div className="step-line done" />
          <div className="step">
            <div className="step-circle done">2</div>
            <div className="step-label done">Address</div>
          </div>
          <div className="step-line done" />
          <div className="step">
            <div className="step-circle active">3</div>
            <div className="step-label active">Payment</div>
          </div>
        </div>

                        <div className="sc-bBXxYQ" />

                        {/* Payment Header */}
                        <div className="gNFCeh">
                            <h6 className="hEBjyt">Select Payment Method</h6>
                            <svg width={80} height={24} viewBox="0 0 80 24" fill="none">
                                <path fillRule="evenodd" clipRule="evenodd" d="M11.1172 3C10.3409 3 9.04382 3.29813 7.82319 3.63C6.57444 3.9675 5.31557 4.36687 4.57532 4.60875C4.26582 4.71096 3.99143 4.8984 3.78367 5.14954C3.57591 5.40068 3.44321 5.70533 3.40082 6.0285C2.73032 11.0651 4.28619 14.7979 6.17394 17.2672C6.97447 18.3236 7.92897 19.2538 9.00557 20.0269C9.43982 20.334 9.84257 20.5691 10.1845 20.73C10.4995 20.8785 10.8382 21 11.1172 21C11.3962 21 11.7337 20.8785 12.0498 20.73C12.4621 20.5296 12.8565 20.2944 13.2288 20.0269C14.3054 19.2538 15.2599 18.3236 16.0604 17.2672C17.9482 14.7979 19.504 11.0651 18.8335 6.0285C18.7912 5.70518 18.6586 5.40035 18.4508 5.14901C18.2431 4.89768 17.9686 4.71003 17.659 4.60762C16.5845 4.25529 15.5015 3.92894 14.4112 3.62888C13.1905 3.29925 11.8934 3 11.1172 3Z" fill="#ADC6FF" />
                            </svg>
                        </div>

                        {/* Offer Banner */}
                        <div className="cHsEym">
                            <div className="efQsfx">
                                <img src="/ezgif-2-aefef6d1c8.gif" width={60} alt="offer" />
                                <div className="cOCnuI">
                                    <span className="eNkLGR RrifI">
                                        Pay online &amp; get EXTRA ₹33 off
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* UPI Options */}
                        <div>
                            <div className="GmPbS">
                                <span>PAY ONLINE</span>
                                <div />
                            </div>
                            <ul className="accordion">
                                <li className="accordion-item is-active">
                                    <h3 className="accordion-thumb">
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <img src="https://images.meesho.com/files/headless/upi_ppr.png" width="20px" alt="UPI" />
                                            <span style={{ paddingLeft: '8px' }}>UPI (GPay / PhonePe / Paytm)</span>
                                        </div>
                                    </h3>
                                    <div className="plans">
                                        {products.Gpay !== false && (
                                            <div
                                                className={`form-check available-method ${activeTab === 2 ? "active" : ""}`}
                                                onClick={() => handleTabClick(2)}
                                            >
                                                <label className="form-check-label">
                                                    <img src="https://cdn141.picsart.com/363807473021211.png" className="pay-logo" alt="GPay" />
                                                    <span className="unaviablee m-0"><b>G Pay</b></span>
                                                </label>
                                            </div>
                                        )}
                                        {products.Phonepe !== false && (
                                            <div
                                                className={`form-check available-method ${activeTab === 3 ? "active" : ""}`}
                                                onClick={() => handleTabClick(3)}
                                            >
                                                <label className="form-check-label">
                                                    <img
                                                        src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJQAAACUCAMAAABC4vDmAAAAbFBMVEVfJJ////9eIZ5VCJq6p9NXD5tYE5zZzuj49Purlsnm3u9bHJ1cGJ5QAJhjK6H+/f+mjsiDX7OfhMOQb7rTx+O3otLg1+vGt9tzRKnJvNyZfL9wQKnBrtiWeL7u6fR0SKp/V7FoM6R3TqyKZ7ey+6qTAAAGyklEQVR4nO2cbZuqIBCGEdJUItK02kprt///H4/am4LJMHD28sM+X3u7AxxmhhlI4CRZp7vivEheWpyLXVpLt28l+I/GRXnMDiRiiiJyyI5lEf82lEy/jichRMQpJZoo5VHz4un4leKGDAEl0022FiHXaYbioVhnGwyXLZRcJkQwPjI+Y6KcCZIsbbnsoOQ5o8w4RMqAMZqd7bBsoNKcCegYDcdLsDz9L1BptQ4RRA+ucF3BsaBQu0rgke5Yotp5haorEroQ3RWSqvYGFZeUOY3SU83XlBCbCoBaXsw2CSoeXpYeoOJceEPqsERuHCwT1PLCfCK1YsbBmoaSiVj5ZiJkJZJpYzoJVV/9LHBVlF0nH8MpqOXB+9Q9xQ5TUzgBtfe7wofiYo+B2vyfqXuKso01lMwF4JtXjaOJfhJE/mm5f4Lampho48OJbFMmNyGQQyq2VlDxzcDUOEmXvLj/U5mskYtP3Mbt6DjUbfqxi8QpWfa+b0eRc8huYChpmLvVVrUy6Td2rLZj62oMyrTGhe6uLdHrKodBbUxrXHzpHzpHOCgiRiyDDrU3mnG6HnEhE4gJGRPTragGBZkIKgqdKkfuSVRoO44KVR8gS5YSfQbjG9Jj5gf1uVGg5BX2f+nI1iUPyHXFrsojqEAl0Dmg0VmjSk9Iw8CSKSiLJ5uKUqdCGgZ1WQ2g4ouFZaZMp9qvcFSry2C/GUBZPkBCGfWWCmkY2MCG9qGWlt845hJtkIZhMIE9qPhivU51l0hWuLHi/QnsQZUIOyOOKlV8xRmGsByDqinmgWbaNl8fUH4Mp/UIVIVbDWKrOmr1CmWuWKVD7QjS+WCZSlVgMmvNz+80qAqd6wm1yHKPMqJhpUKlWM+j/bYflQrnx7ycxycUfqBaqovqi6L8mNdQPaDStVPkGZ2UsYozxJ+k63QAlTtmD1cnxRlFmasw70NJ5xB9RZQZTBHBIGWyB3V2WOYPcaK4yDuEMRbnN5TMPORXOFdm8MveMPBMvqCWY2dRw3er52cjEkJxRvfi/SJszVK6fEEZneDosICoVPbB8/uVowBh3R3jFkoSw+zxg+NRZwDNLXEiH1BGax6NxdbWVCD73Fn1FsroLXqBCtJvwMLvnFkCefb8QAU3gKPVPX8EssV4gjoC5q/bakhrT0zv/EWoLqVDIO+NKvenDwoVHjsoc7DNvx2KDCyh+KmFigH2YyRERwjmioi4gSoAUGOpH3ttQWGOKBqoEmJpqciLtJPizdWpquFMy/cLJWx/bmaFBEeYNxbxdSuuROpbuh6KDBMo8ft1YIwTHQMCd1toKzV9sA3pUKECFb1eAf5MYz5JfbDyekIVSh3nSIGyTg7RQ01SuyD0F6AapJ2dg///oUi0I4VdhPYLUKwg5/lBncliflALAk5S/x5U8gf1B/UH9Qf1B4WBmuU2M8sNeZaui6WTp0bwWoDpxcmzdIebWGMg7WzBiztsGThw5ShNy454CRwsM8NcObNK1WjOGaoNsaDB6EP0e5jEl5kSiztDtcEoLGx/Q1ElW67W6zhDdWE7JMHRU6hWbmRDKneoApgK6kOp1X1x9q4HpTQSzlAxLGnWFxUKVCDLS8jCKAqZoKftl3SDuifNYAm2t/RypyAuFnlV5cl+qZUEW0M90ovmROxAUaVBTcga6pGItTwVVY2CX6hnytr2YI3ZJLBtoZ7JfeuimZGSSm9Qz2MQ6+N/foVnsG2hXgdGxqM17ZOfq7Ydod5Ha/BKvBcVOK9uCfU+hAQc1yqiKyiVHVT/uBZxsA3ofkFA9Q+2MSUA7AfQKmQL1S8BQBVLcHEbaXGUyk5jBTUslsCVlUT8muz6XHGx+Vk5eAnDshJsAQ4XQvzkSdko2dyIEIyrJw4WUGoBDr5UifLGb2nFou7nHZw8tVTJqahrIAcorajLrarLC5Re/oYvFPQFNVYoiC2p9AY1VlKJLD71BjVefIoq0/UHNV6miylo9gf1qaDZuvTbJ9Sn0m98l4k71Ociebt2Ap9QU+0E+JaqHlRhDzXZeIFwjDWFC3uo6RYVcDPPZz2cRxsoUzMPsO1pSsOgAgBlbHvysKzowM2rjWYG0CAGaaUz/kqexvKu2FwJBGmlAzQdGsVIVt31Y9y6YE2H5vZMsyhfRZ2MCxTanmlsZPUoeCOrseXXmyxafgHN0X5k1xwNaCP3wWTXRg4tinZjsm64n+XVBME8L3GY53UX87wYZJ5XqASzvGwmmOe1PMEsLzAK5nnVUzDLS7FazfD6sFYzvGitw5rflXStZnh5X4c1v2sO71yzuxDyyTW3qzOfmtsloy/9n+tY/wG5qnKyNMAIDQAAAABJRU5ErkJggg=="
                                                        className="pay-logo" alt="PhonePe" />
                                                    <span className="unaviablee m-0 "><b>PhonePe</b></span>
                                                </label>
                                            </div>
                                        )}
                                        {products.Paytm !== false && (
                                            <div
                                                className={`form-check available-method ${activeTab === 4 ? "active" : ""}`}
                                                onClick={() => handleTabClick(4)}
                                            >
                                                <label className="form-check-label">
                                                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg" className="pay-logo" alt="Paytm" />
                                                    <span className="unaviablee m-0"><b>Paytm</b></span>
                                                </label>
                                            </div>
                                        )}
                                        {products.Bhim !== false && (
                                            <div
                                                className={`form-check available-method ${activeTab === 1 ? "active" : ""}`}
                                                onClick={() => handleTabClick(1)}
                                            >
                                                <label className="form-check-label">
                                                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTnMDjlc4aJzqc4vfL9BFw9hxrZk0nRyBAHwc95tUX_rlJMvwdHwHUU4FwuqQ&s" className="pay-logo" alt="BHIM UPI" />
                                                    <span className="unaviablee">BHIM UPI</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            </ul>
                        </div>

                        {/* Price Summary */}
                        <div className="cart__footer">
                            <div className="cart__price__details">
                                <div className="cart__breakup__inner">
                                    <div className="shipping__total">
                                        <span>Shipping:</span>
                                        <span>FREE</span>
                                    </div>
                                    <div className="cart__total">
                                        <span>Total Product Price:</span>
                                        <span className="cartTotalAmount">₹{totalMrp}.00</span>
                                    </div>
                                    <div className="sc-bBXxYQ" style={{ marginTop: '12px', marginBottom: '4px' }} />
                                    <div className="mc_pay__total">
                                        <span>Order Total:</span>
                                        <span className="cartTotalAmount">₹{totalMrp}.00</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom CTA */}
                        <div className="ixHOyU">
                            <div className="eGwEyP">
                                <div className="dUijPM">
                                    <span className="cartTotalAmount">₹{totalMrp}.00</span>
                                    <button className="ylmAj">VIEW PRICE DETAILS</button>
                                </div>
                                <div className="iAFVK">
                                    <a
                                        href={payment || '#'}
                                        className="bwHzRF"
                                    >
                                        Order Now
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Payments;
