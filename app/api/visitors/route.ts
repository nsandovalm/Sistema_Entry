import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Add the current timestamp
    const visitorData = {
      ...body,
      timestamp: new Date().toISOString(),
    };

    // Add the visitor data to Firestore
    const docRef = await addDoc(collection(db, 'visitors'), visitorData);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'Visitor registered successfully'
    });
  } catch (error) {
    console.error('Error registering visitor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register visitor' },
      { status: 500 }
    );
  }
} 