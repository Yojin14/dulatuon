@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
{!! $slot !!}
<br>
<span class="tagline">LEARN BY PLAYING</span>
</a>
</td>
</tr>
