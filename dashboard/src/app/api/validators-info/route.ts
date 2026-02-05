export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { fetchAllValidatorsFromStakeWiz, ValidatorInfo } from '@/lib/validator-names';

export const revalidate = 1800; // 30 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const voteAccount = searchParams.get('voteAccount');
    const limit = parseInt(searchParams.get('limit') || '100');
    const jitoOnly = searchParams.get('jitoOnly') === 'true';
    
    const validators = await fetchAllValidatorsFromStakeWiz();
    
    // If specific validator requested
    if (voteAccount) {
      const info = validators.get(voteAccount);
      if (!info) {
        return NextResponse.json({ error: 'Validator not found' }, { status: 404 });
      }
      return NextResponse.json({ validator: info });
    }
    
    // Return list of validators
    let validatorList = Array.from(validators.values());
    
    // Filter to Jito validators only if requested
    if (jitoOnly) {
      validatorList = validatorList.filter(v => v.isJito);
    }
    
    // Sort by activated stake (descending)
    validatorList.sort((a, b) => b.activatedStake - a.activatedStake);
    
    // Apply limit
    validatorList = validatorList.slice(0, limit);
    
    return NextResponse.json({
      count: validatorList.length,
      totalValidators: validators.size,
      validators: validatorList,
    });
    
  } catch (error) {
    console.error('Error fetching validator info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch validator info' },
      { status: 500 }
    );
  }
}
