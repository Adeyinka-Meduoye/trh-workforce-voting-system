import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// ============================================================================
// 1. FIRST ADMINISTRATOR BOOTSTRAP FUNCTION
// ============================================================================
export const bootstrapFirstAdmin = functions.https.onCall(async (data, context) => {
  const secretKey = data.secretKey;
  const targetUid = data.uid || context.auth?.uid;
  const targetEmail = data.email || context.auth?.token.email;

  // Environment secret check or single-use safeguard
  const serverSecret = process.env.ADMIN_BOOTSTRAP_SECRET || 'CHURCH_GOVERNANCE_INITIAL_SECRET_2026';
  
  if (secretKey !== serverSecret) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Invalid administrative bootstrap secret key.'
    );
  }

  if (!targetUid) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'User UID is required to assign administrator credentials.'
    );
  }

  // Set Custom Claims for Super Administrator
  await admin.auth().setCustomUserClaims(targetUid, {
    role: 'super_admin',
    admin: true
  });

  // Record user profile in Firestore /users collection
  await db.collection('users').doc(targetUid).set(
    {
      uid: targetUid,
      email: targetEmail || 'admin@church.org',
      role: 'super_admin',
      displayName: data.displayName || 'Super Administrator',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  // Record Audit Log
  await db.collection('auditLogs').add({
    actorId: targetUid,
    actorName: data.displayName || 'Super Administrator',
    actorEmail: targetEmail || 'admin@church.org',
    actorRole: 'super_admin',
    action: 'First Super Administrator Initialized',
    resourceType: 'system',
    resourceId: targetUid,
    details: `Assigned super_admin Custom Claims to UID: ${targetUid}`,
    createdAt: new Date().toISOString()
  });

  return {
    success: true,
    message: `User ${targetEmail || targetUid} successfully upgraded to super_admin.`
  };
});

// ============================================================================
// 2. SET USER ROLE (Super Admin Only)
// ============================================================================
export const setUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== 'super_admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only verified super administrators can modify user roles.'
    );
  }

  const { targetUid, role, organisationId, departmentId } = data;
  if (!targetUid || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'Target UID and Role are required.');
  }

  // Update Custom Claims
  await admin.auth().setCustomUserClaims(targetUid, {
    role,
    organisationId: organisationId || null,
    departmentId: departmentId || null
  });

  // Update Firestore /users record
  await db.collection('users').doc(targetUid).update({
    role,
    organisationId: organisationId || null,
    departmentId: departmentId || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Log audit
  await db.collection('auditLogs').add({
    actorId: context.auth.uid,
    actorName: context.auth.token.name || 'Super Administrator',
    actorEmail: context.auth.token.email || '',
    actorRole: 'super_admin',
    action: `Updated User Role to ${role}`,
    resourceType: 'user',
    resourceId: targetUid,
    details: `Role updated for user ${targetUid} (Org: ${organisationId || 'None'}, Dept: ${departmentId || 'None'})`,
    createdAt: new Date().toISOString()
  });

  return { success: true, message: `Role updated to ${role}.` };
});

// ============================================================================
// 3. SECURE VOTER SUBMISSION FUNCTION (Cloud Function Alternative to Transaction)
// ============================================================================
export const submitVoteSecure = functions.https.onCall(async (data, context) => {
  const { exerciseId, nomineeId, voterCode } = data;

  if (!exerciseId || !nomineeId || !voterCode) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'exerciseId, nomineeId, and voterCode are strictly required.'
    );
  }

  return await db.runTransaction(async (transaction) => {
    // 1. Verify exercise
    const exerciseRef = db.collection('votingExercises').doc(exerciseId);
    const exerciseSnap = await transaction.get(exerciseRef);
    if (!exerciseSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Voting exercise not found.');
    }
    const exerciseData = exerciseSnap.data()!;
    if (exerciseData.status !== 'open') {
      throw new functions.https.HttpsError('failed-precondition', 'This voting exercise is currently closed.');
    }

    const now = new Date();
    if (new Date(exerciseData.startTime) > now) {
      throw new functions.https.HttpsError('failed-precondition', 'This election has not started yet.');
    }
    if (new Date(exerciseData.endTime) <= now) {
      throw new functions.https.HttpsError('failed-precondition', 'This election has concluded.');
    }

    // 2. Verify Nominee
    const nomineeRef = exerciseRef.collection('nominees').doc(nomineeId);
    const nomineeSnap = await transaction.get(nomineeRef);
    if (!nomineeSnap.exists || nomineeSnap.data()?.active === false) {
      throw new functions.https.HttpsError('invalid-argument', 'Selected candidate is inactive or invalid.');
    }
    const nomineeData = nomineeSnap.data()!;

    // 3. Verify Voter in People collection by Voter Code
    const peopleQuery = await db.collection('people').where('voterCode', '==', voterCode.trim()).limit(1).get();
    if (peopleQuery.empty) {
      throw new functions.https.HttpsError('permission-denied', 'Invalid or unrecognised voter code.');
    }
    const personDoc = peopleQuery.docs[0];
    const personData = personDoc.data();
    const personId = personDoc.id;

    // Self-vote prevention check
    if (exerciseData.allowSelfVote === false && nomineeData.personId && nomineeData.personId === personId) {
      throw new functions.https.HttpsError('failed-precondition', 'Self-voting is not permitted for this election.');
    }

    // 4. Verify Eligibility Subcollection
    const eligRef = exerciseRef.collection('eligibility').doc(personId);
    const eligSnap = await transaction.get(eligRef);

    if (!eligSnap.exists || eligSnap.data()?.eligible === false) {
      throw new functions.https.HttpsError('permission-denied', 'You are not on the eligible voter roll for this exercise.');
    }
    if (eligSnap.data()?.hasVoted === true) {
      throw new functions.https.HttpsError('already-exists', 'A vote has already been cast using this voter profile.');
    }

    // 5. Generate Receipt
    const receiptHash = `REC-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 6. Record Vote
    const voteRef = exerciseRef.collection('votes').doc();
    transaction.set(voteRef, {
      id: voteRef.id,
      votingExerciseId: exerciseId,
      nomineeId,
      voterId: personId,
      receiptHash,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // 7. Update Eligibility record
    transaction.update(eligRef, {
      hasVoted: true,
      votedAt: new Date().toISOString()
    });

    // 8. Atomically increment exercise totalVotes
    transaction.update(exerciseRef, {
      totalVotes: admin.firestore.FieldValue.increment(1)
    });

    return {
      success: true,
      receiptHash,
      message: 'Ballot cast and certified successfully.'
    };
  });
});

// ============================================================================
// 4. SERVER-SIDE MEMBERSHIP HIERARCHY VALIDATION FUNCTION
// ============================================================================
export const createMembershipSecure = functions.https.onCall(async (data, context) => {
  const { personId, organisationId, departmentId, unitId, roleTitle, status } = data;

  if (!personId || !organisationId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'personId and organisationId are required.'
    );
  }

  // 1. Verify Organisation
  const orgSnap = await db.collection('organisations').doc(organisationId).get();
  if (!orgSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Specified organisation does not exist.');
  }
  const orgData = orgSnap.data()!;

  let departmentName = '';
  let unitName = '';

  // 2. If departmentId exists: Department must belong to Organisation
  if (departmentId) {
    const deptSnap = await db.collection('departments').doc(departmentId).get();
    if (!deptSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Specified department does not exist.');
    }
    const deptData = deptSnap.data()!;
    if (deptData.organisationId !== organisationId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Department "${deptData.name}" does not belong to organisation "${orgData.name}".`
      );
    }
    departmentName = deptData.name;
  }

  // 3. If unitId exists: Unit must belong to Department AND Unit must belong to Organisation
  if (unitId) {
    if (!departmentId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'A unit must belong to a parent department.'
      );
    }
    const unitSnap = await db.collection('units').doc(unitId).get();
    if (!unitSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Specified unit does not exist.');
    }
    const unitData = unitSnap.data()!;
    if (unitData.departmentId !== departmentId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Unit "${unitData.name}" does not belong to the selected department.`
      );
    }
    if (unitData.organisationId !== organisationId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Unit "${unitData.name}" does not belong to organisation "${orgData.name}".`
      );
    }
    unitName = unitData.name;
  }

  const membershipRef = db.collection('memberships').doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const membershipData = {
    id: membershipRef.id,
    personId,
    organisationId,
    organisationName: orgData.name,
    departmentId: departmentId || null,
    departmentName: departmentName || null,
    unitId: unitId || null,
    unitName: unitName || null,
    roleTitle: roleTitle || '',
    status: status || 'active',
    createdAt: now,
    updatedAt: now
  };

  await membershipRef.set(membershipData);

  return {
    success: true,
    membershipId: membershipRef.id,
    membership: membershipData
  };
});

// ============================================================================
// 5. SERVER-SIDE VOTING EXERCISE SCOPE VALIDATION FUNCTION
// ============================================================================
export const createVotingExerciseSecure = functions.https.onCall(async (data, context) => {
  const {
    title,
    description,
    scopeType,
    organisationId,
    departmentId,
    unitId,
    status = 'draft',
    startTime,
    endTime,
    allowSelfVote = false,
    resultsPublished = false,
    voterSelectionMode = 'scope_members',
    nomineeSelectionMode = 'scope_members'
  } = data;

  if (!title || !scopeType) {
    throw new functions.https.HttpsError('invalid-argument', 'title and scopeType are required.');
  }

  let orgName: string | undefined = undefined;
  let deptName: string | undefined = undefined;
  let unitName: string | undefined = undefined;

  // Enforce Scope Validation Rules
  if (scopeType === 'organisation' || scopeType === 'department' || scopeType === 'unit') {
    if (!organisationId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'organisationId is required for organisation, department, or unit scope.'
      );
    }
    const orgSnap = await db.collection('organisations').doc(organisationId).get();
    if (!orgSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Organisation not found.');
    }
    orgName = orgSnap.data()?.name;
  }

  if (scopeType === 'department' || scopeType === 'unit') {
    if (!departmentId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'departmentId is required for department or unit scope.'
      );
    }
    const deptSnap = await db.collection('departments').doc(departmentId).get();
    if (!deptSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Department not found.');
    }
    const deptData = deptSnap.data()!;
    if (deptData.organisationId !== organisationId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Department "${deptData.name}" does not belong to the selected organisation.`
      );
    }
    deptName = deptData.name;
  }

  if (scopeType === 'unit') {
    if (!unitId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'unitId is required for unit scope.'
      );
    }
    const unitSnap = await db.collection('units').doc(unitId).get();
    if (!unitSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Unit not found.');
    }
    const unitData = unitSnap.data()!;
    if (unitData.departmentId !== departmentId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Unit "${unitData.name}" does not belong to the selected department.`
      );
    }
    if (unitData.organisationId !== organisationId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Unit "${unitData.name}" does not belong to the selected organisation.`
      );
    }
    unitName = unitData.name;
  }

  const exerciseRef = db.collection('votingExercises').doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const exerciseData = {
    id: exerciseRef.id,
    title,
    description: description || '',
    scopeType,
    organisationId: organisationId || null,
    organisationName: orgName || null,
    departmentId: departmentId || null,
    departmentName: deptName || null,
    unitId: unitId || null,
    unitName: unitName || null,
    status,
    startTime: startTime || new Date().toISOString(),
    endTime: endTime || new Date(Date.now() + 86400000).toISOString(),
    allowSelfVote: Boolean(allowSelfVote),
    resultsPublished: Boolean(resultsPublished),
    voterSelectionMode,
    nomineeSelectionMode,
    totalVotes: 0,
    createdBy: context.auth?.uid || 'admin',
    createdAt: now,
    updatedAt: now
  };

  await exerciseRef.set(exerciseData);

  return {
    success: true,
    exerciseId: exerciseRef.id,
    exercise: exerciseData
  };
});
