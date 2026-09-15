import React, { useState, useEffect } from 'react';
import {
  VotingExercise,
  Department,
  Organisation,
  Person,
  VotingResult
} from '../../types';
import {
  getVotingExercises,
  getDepartments,
  getOrganisations,
  getPeople,
  getVotingResults
} from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useActionModal } from '../../context/ActionModalContext';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Users,
  Building2,
  CheckCircle2,
  Award,
  Vote,
  Calendar,
  Filter,
  RefreshCw,
  Crown,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';

const PALETTE = ['#FF8A00', '#251464', '#10B981', '#38BDF8', '#818CF8', '#F59E0B', '#EC4899', '#A855F7'];

export const VotingAnalyticsSection: React.FC = () => {
  const { adminUser, userProfile } = useAuth();
  const { notifyAction } = useActionModal();

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<VotingExercise[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [exerciseResults, setExerciseResults] = useState<Record<string, VotingResult>>({});

  // Filters
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [exList, orgList, deptList, pplList] = await Promise.all([
        getVotingExercises({ includeArchived: true }),
        getOrganisations(true),
        getDepartments(undefined, true),
        getPeople(true)
      ]);

      setExercises(exList);
      setOrganisations(orgList);
      setDepartments(deptList);
      setPeople(pplList);

      // Load results for exercises with votes or concluded status (skipping draft/unstarted exercises)
      const resultsMap: Record<string, VotingResult> = {};
      await Promise.all(
        exList.map(async (ex) => {
          if (ex.status === 'draft' || (!ex.totalVotes && ex.status === 'scheduled')) {
            return;
          }
          try {
            const res = await getVotingResults(ex.id);
            if (res) {
              resultsMap[ex.id] = res;
            }
          } catch (e) {
            // ignore individual result load error
          }
        })
      );
      setExerciseResults(resultsMap);

      notifyAction({
        type: 'read',
        title: 'Loaded Voting Analytics & Participation Data',
        details: `Loaded analytics telemetry across ${exList.length} exercises, ${deptList.length} departments, and ${pplList.length} church members.`,
        resourceName: 'Voting Analytics Engine',
        actorName: adminUser?.fullName || userProfile?.displayName || 'Super Admin',
        actorRole: adminUser?.role || 'super_admin'
      });
    } catch (err) {
      console.error('Error loading voting analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered exercises
  const filteredExercises = exercises.filter((ex) => {
    if (selectedOrgFilter !== 'all' && ex.organisationId !== selectedOrgFilter) return false;
    if (selectedStatusFilter !== 'all' && ex.status !== selectedStatusFilter) return false;
    return true;
  });

  // Calculate Aggregates
  let totalBallotsCast = 0;
  let totalEligibleAcrossExercises = 0;

  filteredExercises.forEach((ex) => {
    const res = exerciseResults[ex.id];
    if (res) {
      totalBallotsCast += res.totalVotes || 0;
      totalEligibleAcrossExercises += res.totalEligible || 0;
    } else {
      totalBallotsCast += ex.totalVotes || 0;
      totalEligibleAcrossExercises += ex.eligibleVotersCount || 0;
    }
  });

  const overallTurnoutRate =
    totalEligibleAcrossExercises > 0
      ? ((totalBallotsCast / totalEligibleAcrossExercises) * 100).toFixed(1)
      : '0.0';

  // 1. Department Turnout & Participation Data
  const departmentStatsMap: Record<
    string,
    { name: string; orgName: string; totalVotes: number; totalEligible: number; exercisesCount: number }
  > = {};

  // Initialize for all known departments
  departments.forEach((dept) => {
    const org = organisations.find((o) => o.id === dept.organisationId);
    departmentStatsMap[dept.id] = {
      name: dept.name,
      orgName: org ? org.name : 'Church Ministry',
      totalVotes: 0,
      totalEligible: 0,
      exercisesCount: 0
    };
  });

  // Tally from exercises
  filteredExercises.forEach((ex) => {
    const deptId = ex.departmentId;
    const res = exerciseResults[ex.id];
    const votes = res ? res.totalVotes : ex.totalVotes || 0;
    const eligible = res ? res.totalEligible : ex.eligibleVotersCount || 0;

    if (deptId && departmentStatsMap[deptId]) {
      departmentStatsMap[deptId].totalVotes += votes;
      departmentStatsMap[deptId].totalEligible += eligible;
      departmentStatsMap[deptId].exercisesCount += 1;
    } else if (ex.departmentName) {
      // General or unmapped dept
      const key = ex.departmentName;
      if (!departmentStatsMap[key]) {
        departmentStatsMap[key] = {
          name: ex.departmentName,
          orgName: ex.organisationName || 'General',
          totalVotes: 0,
          totalEligible: 0,
          exercisesCount: 0
        };
      }
      departmentStatsMap[key].totalVotes += votes;
      departmentStatsMap[key].totalEligible += eligible;
      departmentStatsMap[key].exercisesCount += 1;
    }
  });

  const departmentChartData = Object.values(departmentStatsMap)
    .filter((d) => d.totalVotes > 0 || d.totalEligible > 0 || d.exercisesCount > 0)
    .map((d) => {
      const turnout = d.totalEligible > 0 ? Math.round((d.totalVotes / d.totalEligible) * 100) : 0;
      return {
        name: d.name.length > 20 ? `${d.name.slice(0, 18)}...` : d.name,
        fullName: d.name,
        orgName: d.orgName,
        votes: d.totalVotes,
        eligible: d.totalEligible,
        turnoutRate: turnout
      };
    })
    .sort((a, b) => b.votes - a.votes);

  // Find most active department
  const mostActiveDept = departmentChartData.length > 0 ? departmentChartData[0] : null;

  // 2. Vote Distribution by Organisation (Pie Chart)
  const orgVotesMap: Record<string, { name: string; votes: number }> = {};
  filteredExercises.forEach((ex) => {
    const orgName = ex.organisationName || 'Other / General';
    const res = exerciseResults[ex.id];
    const votes = res ? res.totalVotes : ex.totalVotes || 0;

    if (!orgVotesMap[orgName]) {
      orgVotesMap[orgName] = { name: orgName, votes: 0 };
    }
    orgVotesMap[orgName].votes += votes;
  });

  const orgPieData = Object.values(orgVotesMap).filter((o) => o.votes > 0);

  // 3. Exercise Turnout Chronology (Area/Line Chart)
  const timelineData = [...filteredExercises]
    .sort((a, b) => new Date(a.startTime || a.createdAt).getTime() - new Date(b.startTime || b.createdAt).getTime())
    .map((ex) => {
      const res = exerciseResults[ex.id];
      const votes = res ? res.totalVotes : ex.totalVotes || 0;
      const eligible = res ? res.totalEligible : ex.eligibleVotersCount || 0;
      const turnout = eligible > 0 ? Math.round((votes / eligible) * 100) : 0;

      return {
        title: ex.title.length > 18 ? `${ex.title.slice(0, 16)}...` : ex.title,
        fullTitle: ex.title,
        date: new Date(ex.startTime || ex.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        votes,
        eligible,
        turnout
      };
    });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-[#F8FAFC] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#FF8A00]" />
            Voting Analytics & Department Participation
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Real-time visualizations of church-wide voter engagement, turnout trajectories, and department vote distributions.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] rounded-xl text-xs font-semibold transition-all border border-slate-700/60 shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FF8A00]' : 'text-[#94A3B8]'}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-[#94A3B8] font-semibold">
            <Filter className="w-4 h-4 text-[#FF8A00]" />
            <span>Filter By:</span>
          </div>

          <select
            value={selectedOrgFilter}
            onChange={(e) => setSelectedOrgFilter(e.target.value)}
            className="px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
          >
            <option value="all">All Church Organisations ({organisations.length})</option>
            {organisations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00]"
          >
            <option value="all">All Exercise Statuses</option>
            <option value="open">Active / Open Now</option>
            <option value="scheduled">Scheduled Upcoming</option>
            <option value="closed">Closed / Concluded</option>
          </select>
        </div>

        <div className="text-xs text-[#94A3B8]">
          Analyzing <strong className="text-[#F8FAFC]">{filteredExercises.length}</strong> voting exercises
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Total Ballots Cast
            </span>
            <div className="p-2 rounded-xl bg-[#FF8A00]/10 text-[#FF8A00] border border-[#FF8A00]/20">
              <Vote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-[#F8FAFC] mt-3">
            {totalBallotsCast.toLocaleString()}
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Across all matching voting exercises</p>
        </div>

        <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Voter Turnout Rate
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-emerald-400 mt-3">
            {overallTurnoutRate}%
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">
            {totalBallotsCast} ballots of {totalEligibleAcrossExercises} eligible voters
          </p>
        </div>

        <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Most Active Department
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold font-display text-[#F8FAFC] mt-3 truncate">
            {mostActiveDept ? mostActiveDept.fullName : 'No data yet'}
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">
            {mostActiveDept ? `${mostActiveDept.votes} votes (${mostActiveDept.turnoutRate}% turnout)` : '—'}
          </p>
        </div>

        <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Church Directory
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-[#F8FAFC] mt-3">
            {people.length}
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">
            {departments.length} departments across {organisations.length} organisations
          </p>
        </div>
      </div>

      {/* Main Charts Section */}
      {loading ? (
        <div className="bg-[#1E293B] rounded-3xl border border-slate-800 py-20 text-center text-[#94A3B8] text-xs flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 text-[#FF8A00] animate-spin" />
          <span>Computing participation analytics & rendering charts...</span>
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="bg-[#1E293B] rounded-3xl border border-slate-800 p-12 text-center space-y-3">
          <BarChart3 className="w-10 h-10 text-[#94A3B8] mx-auto opacity-50" />
          <h3 className="text-base font-bold text-[#F8FAFC]">No Voting Exercises Found</h3>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
            Once voting exercises are created and ballots are cast by church members, interactive participation trends and department breakdowns will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Participation by Department */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-display text-[#F8FAFC] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#FF8A00]" />
                  Department Participation & Vote Volume
                </h3>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  Comparison of valid votes cast vs eligible voter capacity across departments.
                </p>
              </div>
            </div>

            {departmentChartData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-xs text-[#94A3B8]">
                No department vote data recorded yet.
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#94A3B8', fontSize: 10 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#F8FAFC'
                      }}
                      formatter={(val: any, name: any) => [
                        `${val} ${name === 'votes' ? 'Votes Cast' : 'Eligible Voters'}`,
                        name === 'votes' ? 'Ballots' : 'Pool'
                      ]}
                      labelFormatter={(label, payload) => {
                        const item = payload && payload[0] ? payload[0].payload : null;
                        return item ? `${item.fullName} (${item.orgName})` : label;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                      formatter={(value) => (value === 'votes' ? 'Votes Cast' : 'Eligible Voter Pool')}
                    />
                    <Bar dataKey="votes" fill="#FF8A00" radius={[4, 4, 0, 0]} name="votes" />
                    <Bar dataKey="eligible" fill="#334155" radius={[4, 4, 0, 0]} name="eligible" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Vote Share Distribution by Organisation */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-display text-[#F8FAFC] flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-400" />
                  Vote Distribution by Organisation
                </h3>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  Proportion of total church recognition ballots cast by directorate.
                </p>
              </div>
            </div>

            {orgPieData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-xs text-[#94A3B8]">
                No organisation vote data available yet.
              </div>
            ) : (
              <div className="h-72 w-full flex items-center justify-center pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orgPieData}
                      dataKey="votes"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={45}
                      paddingAngle={4}
                      label={({ name, percent }) => `${name.slice(0, 14)}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {orgPieData.map((entry, index) => (
                        <Cell key={`org-cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#F8FAFC'
                      }}
                      formatter={(val: any) => [`${val} Votes`, 'Ballots Cast']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 3: Turnout Rate Trend Over Exercises */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-display text-[#F8FAFC] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  Participation Turnout Rate Trajectory (%)
                </h3>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  Voter turnout percentage trends over consecutive church recognition exercises.
                </p>
              </div>
            </div>

            {timelineData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-[#94A3B8]">
                No voting trajectory data recorded yet.
              </div>
            ) : (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
                    <defs>
                      <linearGradient id="turnoutGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="title" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} domain={[0, 100]} unit="%" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#F8FAFC'
                      }}
                      formatter={(val: any) => [`${val}% Turnout`, 'Participation Rate']}
                      labelFormatter={(label, payload) => {
                        const item = payload && payload[0] ? payload[0].payload : null;
                        return item ? `${item.fullTitle} (${item.date})` : label;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="turnout"
                      stroke="#38BDF8"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#turnoutGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
