import React, { createContext, useContext, useState } from 'react'
import axiosClient from '../api/axiosClient'

const IntakeContext = createContext(null)

// Map the wizard's UI scam types → backend IncidentType choices
function mapScamType(uiScamType) {
  const s = (uiScamType || '').toLowerCase()
  if (s.includes('voice') || s.includes('impersonation')) return 'VOICE_SCAM'
  if (s.includes('telegram')) return 'SMS_IMPERSONATION'
  if (s.includes('sms') || s.includes('fake bank')) return 'SMS_IMPERSONATION'
  if (s.includes('telebirr') || s.includes('wallet') || s.includes('unauthorized')) return 'MOBILE_BANKING_FRAUD'
  if (s.includes('phishing') || s.includes('malicious') || s.includes('link')) return 'PHISHING'
  if (s.includes('sim')) return 'SIM_SWAP'
  return 'OTHER'
}

export function IntakeProvider({ children }) {
  const [reportData, setReportData] = useState({
    fullName: '',
    nationalId: '',
    contactPhone: '',
    scamType: 'Voice Call / Impersonation (የስልክ ጥሪ/አታላይ ማታለል)',
    scammerPhone: '',
    transactionId: '',
    amount: '',
    sourceBank: 'Commercial Bank of Ethiopia (CBE)',
    senderAccount: '',
    targetPlatform: 'Telebirr',
    targetAccount: '',
    narrative: '',
    legalDeclaration: false,
  })
  const [currentStep, setCurrentStep] = useState(1)
  const [submittedCaseRef, setSubmittedCaseRef] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const updateReport = (fields) => {
    setReportData((prev) => ({ ...prev, ...fields }))
  }

  const submitReport = async () => {
    setIsProcessing(true)
    setSubmitError(null)

    // Build payload matching CitizenIncidentSubmissionSerializer
    const idType = /^FIN/i.test(reportData.nationalId) ? 'FAYDA' : 'KEBELE'
    const payload = {
      full_name: reportData.fullName,
      phone_number: reportData.contactPhone,
      id_type: idType,
      verification_token: reportData.nationalId,
      channel: 'WEB',
      incident_type: mapScamType(reportData.scamType),
      description: reportData.narrative || reportData.scamType,
      scammer_phone_number: reportData.scammerPhone || null,
      scammer_identifier: reportData.targetAccount || reportData.senderAccount || null,
      consent_given: !!reportData.legalDeclaration,
    }

    try {
      const { data } = await axiosClient.post('/incidents/submit/', payload)
      setSubmittedCaseRef(data.tracking_code)
      setCurrentStep(4)
      return data.tracking_code
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        err.message ||
        'Submission failed'
      setSubmitError(msg)
      throw err
    } finally {
      setIsProcessing(false)
    }
  }

  const resetForm = () => {
    setReportData({
      fullName: '',
      nationalId: '',
      contactPhone: '',
      scamType: 'Voice Call / Impersonation (የስልክ ጥሪ/አታላይ ማታለል)',
      scammerPhone: '',
      transactionId: '',
      amount: '',
      sourceBank: 'Commercial Bank of Ethiopia (CBE)',
      senderAccount: '',
      targetPlatform: 'Telebirr',
      targetAccount: '',
      narrative: '',
      legalDeclaration: false,
    })
    setCurrentStep(1)
    setSubmittedCaseRef(null)
    setSubmitError(null)
  }

  return (
    <IntakeContext.Provider
      value={{
        reportData,
        updateReport,
        currentStep,
        setCurrentStep,
        submitReport,
        submittedCaseRef,
        resetForm,
        isProcessing,
        submitError,
      }}
    >
      {children}
    </IntakeContext.Provider>
  )
}

export function useIntake() {
  const ctx = useContext(IntakeContext)
  if (!ctx) throw new Error('useIntake must be used within IntakeProvider')
  return ctx
}