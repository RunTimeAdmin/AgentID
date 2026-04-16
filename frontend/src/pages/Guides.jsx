import { useState } from "react";
import { Link } from "react-router-dom";

const BookOpenIcon = ({ className }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>);
const UserIcon = ({ className }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>);
const CodeIcon = ({ className }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>);
const ExternalLinkIcon = ({ className }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>);

function AgentOwnerGuide() {
  return (<div className="animate-fade-in"><h2 className="text-2xl font-bold text-white mb-4">Agent Owner Guide</h2><p className="text-gray-300 mb-4">Learn how to register your AI agent and display trust badges.</p><div className="space-y-4"><a href="https://github.com/RunTimeAdmin/AgentID/blob/main/docs/AGENT_OWNER_GUIDE.md" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-cyan-400 hover:underline"><span>View full guide on GitHub</span><ExternalLinkIcon className="w-4 h-4" /></a></div></div>);
}

function DeveloperGuide() {
  return (<div className="animate-fade-in"><h2 className="text-2xl font-bold text-white mb-4">Developer Integration Guide</h2><p className="text-gray-300 mb-4">Technical documentation for integrating AgentID into your applications.</p><div className="space-y-4"><a href="https://github.com/RunTimeAdmin/AgentID/blob/main/docs/DEVELOPER_GUIDE_TRUSTMARK.md" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-cyan-400 hover:underline"><span>View full guide on GitHub</span><ExternalLinkIcon className="w-4 h-4" /></a></div></div>);
}

export default function Guides() {
  const [activeTab, setActiveTab] = useState("owner");
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <section className="text-center mb-12 animate-fade-in">
        <div className="glass rounded-2xl p-8 md:p-12 border border-gray-700 relative overflow-hidden">
          <div className="relative">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 mb-6">
              <BookOpenIcon className="w-10 h-10 text-cyan-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4"><span className="gradient-text">Guides & Documentation</span></h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Everything you need to register your AI agent, verify its identity, and integrate AgentID trust badges.</p>
          </div>
        </div>
      </section>
      <div className="flex justify-center mb-8">
        <div className="glass rounded-xl p-1 border border-gray-700 inline-flex">
          <button onClick={() => setActiveTab("owner")} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "owner" ? "text-white bg-gradient-to-r from-cyan-500 to-purple-500" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}><UserIcon className="w-4 h-4" />Agent Owner Guide</button>
          <button onClick={() => setActiveTab("developer")} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "developer" ? "text-white bg-gradient-to-r from-cyan-500 to-purple-500" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}><CodeIcon className="w-4 h-4" />Developer Guide</button>
        </div>
      </div>
      <div className="glass rounded-2xl p-6 md:p-8 border border-gray-700">
        {activeTab === "owner" ? <AgentOwnerGuide /> : <DeveloperGuide />}
      </div>
    </div>
  );
}
