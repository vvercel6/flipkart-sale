"use client";
import { useFormik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { useRouter } from "next/navigation"; // ✅ App Router
import { useState } from "react";

// ── Validation Schema ──────────────────────────────────────────────────────────
const AddressSchema = Yup.object({
  fname: Yup.string()
    .min(2, "Name must be at least 2 characters")
    .matches(/^[a-zA-Z\s]+$/, "Name can only contain letters")
    .required("Full name is required"),
  mobile: Yup.string()
    .matches(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .required("Mobile number is required"),
  pincode: Yup.string()
    .matches(/^\d{6}$/, "Pincode must be exactly 6 digits")
    .required("Pincode is required"),
  city: Yup.string()
    .min(2, "City must be at least 2 characters")
    .required("City is required"),
  state: Yup.string().required("Please select a state"),
  house: Yup.string()
    .min(3, "Please enter a valid house/flat number")
    .required("House/flat details are required"),
  colonny: Yup.string()
    .min(3, "Please enter your area or colony")
    .required("Area / Colony is required"),
});

// ── State Code Map ─────────────────────────────────────────────────────────────
const STATE_MAP = {
  "Andhra Pradesh": "AP", "Arunachal Pradesh": "AR", "Assam": "AS",
  "Bihar": "BR", "Chhattisgarh": "CT", "Goa": "GA", "Gujarat": "GJ",
  "Haryana": "HR", "Himachal Pradesh": "HP", "Jammu and Kashmir": "JK",
  "Jammu & Kashmir": "JK", "Jharkhand": "JH", "Karnataka": "KA",
  "Kerala": "KL", "Madhya Pradesh": "MP", "Maharashtra": "MH",
  "Manipur": "MN", "Meghalaya": "ML", "Mizoram": "MZ", "Nagaland": "NL",
  "Odisha": "OR", "Punjab": "PB", "Rajasthan": "RJ", "Sikkim": "SK",
  "Tamil Nadu": "TN", "Telangana": "TS", "Tripura": "TR",
  "Uttarakhand": "UK", "Uttar Pradesh": "UP", "West Bengal": "WB",
  "Andaman and Nicobar Islands": "AN", "Andaman & Nicobar": "AN",
  "Chandigarh": "CH", "Dadra and Nagar Haveli": "DN",
  "Daman and Diu": "DD", "Daman & Diu": "DD", "Delhi": "DL",
  "Lakshadweep": "LD", "Puducherry": "PY", "Pondicherry": "PY",
};

// ── Main Component ─────────────────────────────────────────────────────────────
const Address = () => {
  const router = useRouter();
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldTouched,
    isSubmitting,
  } = useFormik({
    initialValues: {
      fname: "",
      mobile: "",
      pincode: "",
      city: "",
      state: "",
      house: "",
      colonny: "",
    },
    validationSchema: AddressSchema,
    onSubmit: (vals, { setSubmitting }) => {
      try {
        localStorage.setItem(
          "user",
          JSON.stringify({
            address: vals.house,
            name: vals.fname,
            phone: Number(vals.mobile),
          })
        );
        router.push("/payment");
      } catch (err) {
        console.error("Failed to save address:", err);
      } finally {
        setSubmitting(false);
      }
    },
  });

  // ── Geolocation ──────────────────────────────────────────────────────────────
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const addr = data.address || {};

          const fieldsToSet = {
            city: addr.city || addr.town || addr.village || addr.county || "",
            state: STATE_MAP[addr.state || ""] || "",
            pincode: addr.postcode || "",
            colonny: addr.suburb || addr.neighbourhood || addr.road || "",
            house: addr.house_number
              ? `${addr.house_number}${addr.road ? ", " + addr.road : ""}`
              : addr.road || "",
          };

          Object.entries(fieldsToSet).forEach(([key, val]) => {
            if (val) {
              setFieldValue(key, val);
              setFieldTouched(key, false); // clear errors after autofill
            }
          });
        } catch {
          setLocationError("Could not fetch address. Please fill manually.");
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocationError("Location access denied. Please allow location permission.");
        setLocationLoading(false);
      },
      { timeout: 10000, maximumAge: 0 }
    );
  };

  // ── Helper: field error display ──────────────────────────────────────────────
  const fieldError = (name) =>
    touched[name] && errors[name] ? (
      <div className="field-error">{errors[name]}</div>
    ) : null;

  const fieldClass = (name) =>
    `form-control${touched[name] && errors[name] ? " is-invalid" : touched[name] && !errors[name] ? " is-valid" : ""}`;

  const selectClass = (name) =>
    `form-select${touched[name] && errors[name] ? " is-invalid" : touched[name] && !errors[name] ? " is-valid" : ""}`;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
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
        }
        .step { display: flex; flex-direction: column; align-items: center; flex: 1; }
        .step-circle {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; border: 2px solid #ddd;
          background: #fff; color: #999; z-index: 1; position: relative;
        }
        .step-circle.done { background: #5585F8; border-color: #5585F8; color: #fff; }
        .step-circle.active { background: #ffc200; border-color: #ffc200; color: #000000; }
        .step-label { font-size: 10px; margin-top: 4px; color: #999; font-weight: 500; }
        .step-label.active { color: #000000; font-weight: 700; }
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

      <div className="addr-page">
        {/* ── Header ── */}
        <div className="addr-header">
          <Link href="/" className="back-btn">
            <svg width={22} height={22} viewBox="0 0 20 20" fill="none">
              <path d="M13.746 2.314a1.5 1.5 0 0 0-2.14 0L5.475 9.243a1.5 1.5 0 0 0 0 2.114l6.131 6.929a1.5 1.5 0 0 0 2.14-2.113L8.29 10l5.456-6.173a1.5 1.5 0 0 0 0-2.113z" fill="#666" />
            </svg>
          </Link>
          <h4>Add delivery address</h4>
        </div>

        {/* ── Stepper ── */}
        <div className="stepper">
          <div className="step">
            <div className="step-circle done">✓</div>
            <div className="step-label done">Cart</div>
          </div>
          <div className="step-line done" />
          <div className="step">
            <div className="step-circle active">2</div>
            <div className="step-label active">Address</div>
          </div>
          <div className="step-line" />
          <div className="step">
            <div className="step-circle">3</div>
            <div className="step-label">Payment</div>
          </div>
        </div>

        {/* ── Form body ── */}
        <div className="addr-body">
          <div className="section-heading">
            <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
              <path d="M10 0s-6.85-.044-7.35 6.43C2.2 12.165 8 16.915 9.82 17.929a.58.58 0 0 0 .36.087c.1 0 .187-.03.274-.087C12.286 16.915 18.093 12.165 17.35 6.43 16.849-.044 10 0 10 0zm0 9.718a2.718 2.718 0 1 1 0-5.436 2.718 2.718 0 0 1 0 5.436z" fill="#90B1FB" />
            </svg>
            Delivery Address
          </div>

          {/* Location button */}
          <button
            type="button"
            className="location-btn"
            onClick={handleUseCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" stroke="#ffc200" strokeWidth="3" strokeDasharray="30 60" />
                </svg>
                Detecting location…
              </>
            ) : (
              <>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" fill="#ffc200" />
                </svg>
                Use Current Location
              </>
            )}
          </button>

          {locationError && <p className="location-error">⚠ {locationError}</p>}

          <div className="or-divider">or fill manually</div>

          {/* Full Name */}
          <div className="form-floating">
            <input
              className={fieldClass("fname")}
              type="text"
              id="fname"
              name="fname"
              placeholder="Full Name"
              value={values.fname}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <label htmlFor="fname">Full Name *</label>
            {fieldError("fname")}
          </div>

          {/* Mobile */}
          <div className="form-floating">
            <input
              className={fieldClass("mobile")}
              type="tel"
              id="mobile"
              name="mobile"
              placeholder="Mobile Number"
              maxLength={10}
              value={values.mobile}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <label htmlFor="mobile">Mobile Number *</label>
            {fieldError("mobile")}
          </div>

          {/* Pincode */}
          <div className="form-floating">
            <input
              className={fieldClass("pincode")}
              type="text"
              id="pincode"
              name="pincode"
              placeholder="Pincode"
              maxLength={6}
              value={values.pincode}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <label htmlFor="pincode">Pincode *</label>
            {fieldError("pincode")}
          </div>

          {/* City + State */}
          <div className="two-col">
            <div className="form-floating">
              <input
                className={fieldClass("city")}
                type="text"
                id="city"
                name="city"
                placeholder="City"
                value={values.city}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              <label htmlFor="city">City *</label>
              {fieldError("city")}
            </div>
            <div className="form-floating">
              <select
                className={selectClass("state")}
                id="state"
                name="state"
                value={values.state}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="">Select State</option>
                {[
                  ["AP", "Andhra Pradesh"], ["AR", "Arunachal Pradesh"], ["AS", "Assam"],
                  ["BR", "Bihar"], ["CT", "Chhattisgarh"], ["GA", "Goa"], ["GJ", "Gujarat"],
                  ["HR", "Haryana"], ["HP", "Himachal Pradesh"], ["JK", "Jammu & Kashmir"],
                  ["JH", "Jharkhand"], ["KA", "Karnataka"], ["KL", "Kerala"],
                  ["MP", "Madhya Pradesh"], ["MH", "Maharashtra"], ["MN", "Manipur"],
                  ["ML", "Meghalaya"], ["MZ", "Mizoram"], ["NL", "Nagaland"],
                  ["OR", "Odisha"], ["PB", "Punjab"], ["RJ", "Rajasthan"], ["SK", "Sikkim"],
                  ["TN", "Tamil Nadu"], ["TS", "Telangana"], ["TR", "Tripura"],
                  ["UK", "Uttarakhand"], ["UP", "Uttar Pradesh"], ["WB", "West Bengal"],
                  ["AN", "Andaman & Nicobar"], ["CH", "Chandigarh"], ["DN", "Dadra & NH"],
                  ["DD", "Daman & Diu"], ["DL", "Delhi"], ["LD", "Lakshadweep"], ["PY", "Puducherry"],
                ].map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
              <label htmlFor="state">State *</label>
              {fieldError("state")}
            </div>
          </div>

          {/* House */}
          <div className="form-floating">
            <input
              className={fieldClass("house")}
              type="text"
              id="house"
              name="house"
              placeholder="Flat, House no, Building"
              value={values.house}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <label htmlFor="house">House No., Building Name *</label>
            {fieldError("house")}
          </div>

          {/* Colony */}
          <div className="form-floating">
            <input
              className={fieldClass("colonny")}
              type="text"
              id="colonny"
              name="colonny"
              placeholder="Area, Colony, Street"
              value={values.colonny}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <label htmlFor="colonny">Road Name, Area, Colony *</label>
            {fieldError("colonny")}
          </div>
        </div>

        {/* ── Fixed footer CTA ── */}
        <div className="addr-footer">
          <button
            type="button"
            className="save-btn"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Save Address and Continue"}
          </button>
        </div>
      </div>
    </>
  );
};

export default Address;
