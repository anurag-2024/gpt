"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X, Check, Sparkles, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import countries from "@/lib/data/countries.json"

export default function PricingPage() {
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState<"personal" | "business">("personal")
  const [selectedCountry, setSelectedCountry] = useState("India")

  return (
    <div className=" bg-[#0d0d0d] text-[#ececec] relative">
      {/* Close Button */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 cursor-pointer right-6 p-2 hover:bg-[#2f2f2f] rounded-lg transition-colors"
      >
        <X className="h-6 w-6 text-[#8e8ea0]" />
      </button>

      {/* Header */}
      <div className="pt-16 pb-8 text-center">
        <h1 className="text-3xl font-semibold mb-6 text-white">
          Unlock advanced features
        </h1>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setSelectedTab("personal")}
            className={`px-6 py-2.5 rounded-full text-sm cursor-pointer font-medium transition-colors ${
              selectedTab === "personal"
                ? "bg-[#2f2f2f] text-white"
                : "bg-transparent text-[#8e8ea0] hover:text-white"
            }`}
          >
            Personal
          </button>
          <button
            onClick={() => setSelectedTab("business")}
            className={`px-6 py-2.5 rounded-full text-sm cursor-pointer font-medium transition-colors ${
              selectedTab === "business"
                ? "bg-[#2f2f2f] text-white"
                : "bg-transparent text-[#8e8ea0] hover:text-white"
            }`}
          >
            Business
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="w-full pb-10">
        {selectedTab === "personal" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 px-6">
          {/* Free Plan */}
          <div className="bg-[#171717] border border-[#2f2f2f] rounded-xl p-6 flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-4">Free</h2>
              <div className="flex items-baseline mb-1">
                <span className="text-sm text-[#8e8ea0] mr-1">₹</span>
                <span className="text-5xl font-semibold">0</span>
              </div>
              <p className="text-xs text-[#8e8ea0]">INR / month</p>
            </div>

            <p className="text-base mb-5 text-[#ececec]">Intelligence for everyday tasks</p>

            <div className="mb-5">
              <div className="bg-[#2f2f2f] text-[#8e8ea0] text-xs py-2 px-3 rounded-lg text-center">
                Your current plan
              </div>
            </div>

            <div className="space-y-3 flex-1">
              <FeatureItem icon="✦" text="Access to GPT-5" />
              <FeatureItem icon="○" text="Limited file uploads" />
              <FeatureItem icon="⬡" text="Limited and slower image generation" />
              <FeatureItem icon="⏱" text="Limited memory and context" />
              <FeatureItem icon="🔬" text="Limited deep research" />
            </div>

            <div className="mt-6 text-xs text-[#8e8ea0]">
              Have an existing plan? <a href="#" className="underline hover:text-white">See billing help</a>
            </div>
          </div>

          {/* Go Plan */}
          <div className="bg-gradient-to-b from-[#3d3167] to-[#2d2557] border border-[#5d4d8f] rounded-xl p-6 flex flex-col relative">
            <div className="absolute top-4 right-4">
              <span className="bg-[#6e56cf] text-white text-[10px] font-medium px-2.5 py-1 rounded-full">
                NEW
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-4">Go</h2>
              <div className="flex items-baseline mb-1">
                <span className="text-sm text-[#b4a7d6] mr-1">₹</span>
                <span className="text-5xl font-semibold">399</span>
              </div>
              <p className="text-xs text-[#b4a7d6]">INR / month (inclusive of GST)</p>
            </div>

            <p className="text-base mb-5 text-white">More access to popular features</p>

            <Button className="w-full bg-[#6e56cf] hover:bg-[#5d47b8] text-white rounded-full py-5 text-sm font-medium mb-5">
              Upgrade to Go
            </Button>

            <div className="space-y-3 flex-1">
              <FeatureItem icon="✦" text="Expanded Access to GPT-5" light />
              <FeatureItem icon="○" text="Expanded messaging and uploads" light />
              <FeatureItem icon="⬡" text="Expanded and faster image creation" light />
              <FeatureItem icon="⏱" text="Longer memory and context" light />
              <FeatureItem icon="🔬" text="Limited deep research" light />
              <FeatureItem icon="⚙" text="Projects, tasks, custom GPTs" light />
            </div>

            <div className="mt-6 text-xs text-[#b4a7d6]">
              Only available in certain regions. <a href="#" className="underline hover:text-white">Limits apply</a>
            </div>
          </div>

          {/* Plus Plan */}
          <div className="bg-[#171717] border border-[#2f2f2f] rounded-xl p-6 flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-4">Plus</h2>
              <div className="flex items-baseline mb-1">
                <span className="text-sm text-[#8e8ea0] mr-1">₹</span>
                <span className="text-5xl font-semibold">1,999</span>
              </div>
              <p className="text-xs text-[#8e8ea0]">INR / month (inclusive of GST)</p>
            </div>

            <p className="text-base mb-5 text-[#ececec]">More access to advanced intelligence</p>

            <Button className="w-full bg-white hover:bg-[#e0e0e0] text-black rounded-full py-5 text-sm font-medium mb-5">
              Get Plus
            </Button>

            <div className="space-y-3 flex-1">
              <FeatureItem icon="✦" text="GPT-5 with advanced reasoning" />
              <FeatureItem icon="○" text="Expanded messaging and uploads" />
              <FeatureItem icon="⬡" text="Expanded and faster image creation" />
              <FeatureItem icon="⏱" text="Expanded memory and context" />
              <FeatureItem icon="🔬" text="Expanded deep research and agent mode" />
              <FeatureItem icon="⚙" text="Projects, tasks, custom GPTs" />
              <FeatureItem icon="🎬" text="Sora video generation" />
              <FeatureItem icon="💻" text="Codex agent" />
            </div>

            <div className="mt-6 text-xs text-[#8e8ea0]">
              <a href="#" className="underline hover:text-white">Limits apply</a>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="bg-[#171717] border border-[#2f2f2f] rounded-xl p-6 flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-4">Pro</h2>
              <div className="flex items-baseline mb-1">
                <span className="text-sm text-[#8e8ea0] mr-1">₹</span>
                <span className="text-5xl font-semibold">19,900</span>
              </div>
              <p className="text-xs text-[#8e8ea0]">INR / month (inclusive of GST)</p>
            </div>

            <p className="text-base mb-5 text-[#ececec]">Full access to the best of ChatGPT</p>

            <Button className="w-full bg-white hover:bg-[#e0e0e0] text-black rounded-full py-5 text-sm font-medium mb-5">
              Get Pro
            </Button>

            <div className="space-y-3 flex-1">
              <FeatureItem icon="✦" text="GPT-5 with pro reasoning" />
              <FeatureItem icon="○" text="Unlimited messages and uploads" />
              <FeatureItem icon="⬡" text="Unlimited and faster image creation" />
              <FeatureItem icon="⏱" text="Maximum memory and context" />
              <FeatureItem icon="🔬" text="Maximum deep research and agent mode" />
              <FeatureItem icon="⚙" text="Expanded projects, tasks, and custom GPTs" />
              <FeatureItem icon="🎬" text="Expanded Sora video generation" />
              <FeatureItem icon="💻" text="Expanded Codex agent" />
              <FeatureItem icon="🔬" text="Research preview of new features" />
            </div>

            <div className="mt-6 text-xs text-[#8e8ea0]">
              Unlimited subject to abuse guardrails. <a href="#" className="underline hover:text-white">Learn more</a>
            </div>
          </div>
        </div>
        ) : (
          /* Business Tab */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-6 max-w-[900px] mx-auto">
            {/* Free Plan */}
            <div className="bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl p-6 flex flex-col">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-4">Free</h2>
                <div className="flex items-baseline mb-1">
                  <span className="text-sm text-[#8e8ea0] mr-1">₹</span>
                  <span className="text-5xl font-semibold">0</span>
                </div>
                <p className="text-xs text-[#8e8ea0]">INR / month</p>
              </div>

              <p className="text-base mb-5 text-[#ececec]">Intelligence for everyday tasks</p>

              <div className="mb-5">
                <div className="bg-[#2f2f2f] text-[#8e8ea0] text-xs py-2 px-3 rounded-lg text-center">
                  Your current plan
                </div>
              </div>

              <div className="space-y-3 flex-1">
                <FeatureItem icon="✦" text="Access to GPT-5" />
                <FeatureItem icon="○" text="Limited file uploads" />
                <FeatureItem icon="⬡" text="Limited and slower image generation" />
                <FeatureItem icon="⏱" text="Limited memory and context" />
                <FeatureItem icon="🔬" text="Limited deep research" />
              </div>
            </div>

            {/* Business Plan */}
            <div className="bg-gradient-to-b from-[#3d4167] to-[#2d3157] border border-[#4d5d8f] rounded-xl p-6 flex flex-col relative">
              <div className="absolute top-4 right-4">
                <span className="bg-[#5e6ecf] text-white text-[10px] font-medium px-2.5 py-1 rounded-full uppercase">
                  RECOMMENDED
                </span>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-4">Business</h2>
                <div className="flex items-baseline mb-1">
                  <span className="text-sm text-[#b4a7d6] mr-1">₹</span>
                  <span className="text-5xl font-semibold">2,099</span>
                </div>
                <p className="text-xs text-[#b4a7d6]">INR / month (exclusive of GST)</p>
              </div>

              <p className="text-base mb-5 text-white">Secure, collaborative workspace for teams</p>

              <Button className="w-full bg-[#5e6ecf] hover:bg-[#4d5db8] text-white rounded-full py-5 text-sm font-medium mb-5">
                Get Business
              </Button>

              <div className="space-y-3 flex-1">
                <FeatureItem icon="⊕" text="Everything in Plus, with even higher limits" light />
                <FeatureItem icon="∞" text="Unlimited access to our best model for work" light />
                <FeatureItem icon="🔒" text="Advanced security with SSO, MFA & more" light />
                <FeatureItem icon="🛡" text="Privacy built in; data never used for training" light />
                <FeatureItem icon="🔗" text="Integration with Sharepoint & other tools" light />
                <FeatureItem icon="💼" text="Tools for teams like shared projects & custom GPTs" light />
                <FeatureItem icon="📊" text="Simplified billing and user management" light />
              </div>
            </div>
          </div>
        )}

        {/* Enterprise Section with Country Selector */}
        <div className="mt-12 pb-8 relative">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <svg className="h-5 w-5 text-[#8e8ea0]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-[#8e8ea0] text-sm">
              Need more capabilities for your business?
            </p>
            <p className="text-white text-sm">
              See <a href="#" className="underline hover:text-[#8e8ea0]">ChatGPT Enterprise</a>
            </p>
          </div>

          {/* Country Selector - Right Side */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 text-sm text-[#ececec] hover:bg-[#2f2f2f] rounded-lg transition-colors">
                  {selectedCountry}
                  <ChevronDown className="h-4 w-4 text-[#8e8ea0]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-[280px] max-h-[400px] overflow-y-auto bg-[#2f2f2f] border-[#4e4e4e] text-[#ececec]"
              >
                {countries.map((country, index) => (
                  <div key={country}>
                    <DropdownMenuItem
                      className={`flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-[#3f3f3f] focus:bg-[#3f3f3f] focus:text-[#ececec] ${
                        selectedCountry === country ? 'bg-[#3f3f3f]' : ''
                      }`}
                      onClick={() => setSelectedCountry(country)}
                    >
                      <span className="text-sm">{country}</span>
                      {selectedCountry === country && (
                        <Check className="h-4 w-4 text-[#ececec]" />
                      )}
                    </DropdownMenuItem>
                    {selectedCountry === country && index < countries.length - 1 && (
                      <div className="h-px bg-[#4e4e4e] mx-2 my-1" />
                    )}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureItem({ icon, text, light = false }: { icon: string; text: string; light?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`text-base mt-0.5 ${light ? 'text-[#b4a7d6]' : 'text-[#8e8ea0]'}`}>
        {icon}
      </span>
      <span className={`text-xs leading-relaxed ${light ? 'text-white' : 'text-[#ececec]'}`}>
        {text}
      </span>
    </div>
  )
}
